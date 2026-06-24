const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActivityType, 
    Events, 
    REST, 
    Routes 
} = require('discord.js');
const { showLoadingStart, showLoadingStatus, showLoadingEnd } = require('../loaders/handler');
const errors = require('../errors');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const SOURCE = "ERXClient";

class ERXClient {
    constructor({ intents, prefix, token, clientId, database = null }) {
        if (!token || typeof token !== 'string') {
            errors.missing('token', SOURCE, { hint: 'Pass your bot token from the Discord Developer Portal.' });
        }

        if (intents === undefined || intents === null) {
            errors.missing('intents', SOURCE, { hint: 'Pass an array of intents or an intents bitfield number (see the exported Intents helper).' });
        }

        if (database !== null && database !== undefined && typeof database !== 'object') {
            errors.invalidType('database', 'a database instance (such as SyntxDB) or any object that exposes your own database methods', database, SOURCE);
        }

        this.intents = intents;
        this.prefix = prefix;
        this.token = token;
        this.clientId = clientId;
        this.commands = new Map();
        this.aliases = new Map();
        this.interactions = new Map();
        this.modals = new Map();
        this.slashCommands = new Map();

        this.bot = new Client({
            intents: this.intents,
            partials: [Partials.Channel],
        });

        this.database = database || null;
        this.db = this.database;
    }

    setMaxListeners(max) {
        if (typeof max !== 'number') {
            errors.invalidType('max', 'number', max, SOURCE);
        }
        this.bot.setMaxListeners(max);
    }

    ready(callback) {
        this.bot.once(Events.ClientReady, async () => await callback());
    }

    start() {
        this.bot.login(this.token);
    }

    kill() {
        this.bot.destroy();
    }

    command({ name, alias = [], content }) {
        if (typeof name !== 'string' || !name.length) {
            errors.invalidType('name', 'a non-empty string', name, SOURCE, { hint: 'command() requires a "name".' });
        }
        if (typeof content !== 'function') {
            errors.invalidType('content', 'a function', content, SOURCE, { hint: `The command "${name}" needs a "content" function to run when it's used.` });
        }
        this.commands.set(name.toLowerCase(), content);
        alias.forEach(alt => this.aliases.set(alt.toLowerCase(), name.toLowerCase()));
    }
    
    slash({ data, execute, autocomplete = null }) {
        if (!data || typeof data.toJSON !== 'function') {
            errors.invalidType('data', 'a SlashCommand instance (or a builder with toJSON())', data, SOURCE, {
                hint: 'Pass a `new SlashCommand({...})` instance as `data`.',
            });
        }
        if (typeof execute !== 'function') {
            errors.missing('execute', SOURCE, { hint: `The slash command "${data.name}" needs an "execute" function.` });
        }
        this.slashCommands.set(data.name, { data, execute, autocomplete });
    }

    async registerSlashCommands({ guildId = null, showLoad = false } = {}) {
        if (!this.clientId) {
            errors.missing('clientId', SOURCE, { hint: 'Pass a "clientId" in the ERXClient constructor to register slash commands.' });
        }

        const rest = new REST({ version: '10' }).setToken(this.token);
        const globalCommands = [];
        const guildCommands = [];
        for (const cmd of this.slashCommands.values()) {
            if (cmd.data.scope === "guild") {
                guildCommands.push(cmd.data.toJSON());
            } else {
                globalCommands.push(cmd.data.toJSON());
            }
        }

        try {
            if (showLoad) showLoadingStart("Registering Slash Commands");

            if (globalCommands.length > 0) {
                await rest.put(Routes.applicationCommands(this.clientId), { body: globalCommands });
                if (showLoad) console.log(chalk.green(`✔ Registered ${globalCommands.length} global slash commands`));
            }
            if (guildCommands.length > 0) {
                if (!guildId) {
                    errors.missing('guildId', SOURCE, {
                        hint: 'Guild-only commands were found. Pass guildId to registerSlashCommands({ guildId }) or change their scope to "global".',
                    });
                }
                await rest.put(Routes.applicationGuildCommands(this.clientId, guildId), { body: guildCommands });
                if (showLoad) console.log(chalk.green(`✔ Registered ${guildCommands.length} guild slash commands for guild ${guildId}`));
            }
            if (showLoad) showLoadingEnd(0, globalCommands.length + guildCommands.length);
        } catch (err) {
            // Re-throw so the user actually notices a failed registration during startup.
            if (err instanceof errors.SyntxError) throw err;
            errors.api('register slash commands', SOURCE, err, {
                hint: 'Check that the bot token and clientId are correct and that the bot has the "applications.commands" scope.',
            });
        }

        // Guard so calling registerSlashCommands twice doesn't attach duplicate listeners.
        if (this._slashListenerAttached) return;
        this._slashListenerAttached = true;

        this.bot.on(Events.InteractionCreate, async (interaction) => {
            // Handle autocomplete requests separately from command execution.
            if (interaction.isAutocomplete?.()) {
                const cmd = this.slashCommands.get(interaction.commandName);
                if (!cmd || typeof cmd.autocomplete !== 'function') return;
                try {
                    await cmd.autocomplete(interaction, this);
                } catch (err) {
                    // Never throw inside an event listener (it becomes an unhandledRejection).
                    if (!(err instanceof errors.SyntxError)) {
                        new errors.SyntxError({
                            code: errors.ErrorCodes.UNKNOWN,
                            source: SOURCE,
                            message: `Unhandled error inside the autocomplete handler for "${interaction.commandName}".`,
                            cause: err,
                        });
                    }
                }
                return;
            }

            if (!interaction.isChatInputCommand()) return;
            const cmd = this.slashCommands.get(interaction.commandName);
            if (!cmd) return;

            try {
                await cmd.execute(interaction, this);
            } catch (err) {
                // Never throw inside an event listener (it becomes an unhandledRejection).
                if (!(err instanceof errors.SyntxError)) {
                    new errors.SyntxError({
                        code: errors.ErrorCodes.UNKNOWN,
                        source: SOURCE,
                        message: `Unhandled error while executing slash command "${interaction.commandName}".`,
                        cause: err,
                    });
                }
                const errorReply = { content: "An error occurred while running this command.", ephemeral: true };
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp(errorReply);
                    } else {
                        await interaction.reply(errorReply);
                    }
                } catch (_) { /* interaction may have expired; ignore */ }
            }
        });
    }

    modal({ id, run }) {
        if (typeof id !== 'string' || !id.length) {
            errors.invalidType('id', 'a non-empty string', id, SOURCE, { hint: 'This should match the customId used when creating the Modal.' });
        }
        if (typeof run !== 'function') {
            errors.invalidType('run', 'a function', run, SOURCE, { hint: `The modal "${id}" needs a "run" function to handle its submission.` });
        }
        const dynamicPattern = id
            .replace(/\{(.*?)\}/g, `(?<$1>[^-]+)`)
            .replace(/-/g, `\\-`);
        this.modals.set(dynamicPattern, run);
    }

    interaction({ id, content, separator = '-' }) {
        if (typeof id !== 'string' || !id.length) {
            errors.invalidType('id', 'a non-empty string', id, SOURCE, { hint: 'This should match the customId used in your button or select menu.' });
        }
        if (typeof content !== 'function') {
            errors.invalidType('content', 'a function', content, SOURCE, { hint: `The interaction "${id}" needs a "content" function to handle it.` });
        }
        const dynamicPattern = id
            .replace(/\{(.*?)\}/g, `(?<$1>[^${separator}]+)`)
            .replace(new RegExp(`\\${separator}`, 'g'), `\\${separator}`);
        this.interactions.set(dynamicPattern, { content, separator });
    }

    event(name, callback) {
        if (typeof callback !== 'function') {
            errors.invalidType('callback', 'a function', callback, SOURCE, { hint: `Pass a function to run when the "${name}" event fires.` });
        }

        const eventPath = path.join(__dirname, '../events', `${name}.js`);

        const safeCallback = async (...args) => {
            try {
                await callback(...args);
            } catch (err) {
                // Never throw inside an event listener (it becomes an unhandledRejection).
                if (!(err instanceof errors.SyntxError)) {
                    new errors.SyntxError({
                        code: errors.ErrorCodes.UNKNOWN,
                        source: SOURCE,
                        message: `Unhandled error inside the "${name}" event handler.`,
                        cause: err,
                    });
                }
            }
        };

        if (fs.existsSync(eventPath)) {
            const event = require(eventPath);
            this.bot.on(event.trigger, async (...args) => {
                if (event.condition(...args)) await safeCallback(...args);
            });
        } else if (Object.values(Events).includes(name)) {
            this.bot.on(name, safeCallback);
        } else {
            errors.notFound(`The event "${name}"`, SOURCE, {
                hint: 'Use a valid discord.js Events name, or create a matching file in your events folder.',
            });
        }
    }

    presence({ time, activities, status = 'online' }) {
        if (!Array.isArray(activities) || activities.length === 0) {
            errors.invalidValue('activities', '"activities" must be a non-empty array.', SOURCE, { received: activities });
        }
        if (typeof time !== 'number' || time <= 0) {
            errors.invalidType('time', 'a positive number (seconds)', time, SOURCE, { hint: 'This is how often (in seconds) the presence rotates.' });
        }

        this.bot.once(Events.ClientReady, () => {
            let currentIndex = 0;
            const updatePresence = () => {
                try {
                    const activity = activities[currentIndex];
                    if (activity) {
                        const type = this.getActivityType(activity.type);
                        this.bot.user.setPresence({
                            activities: [{ name: activity.content, type }],
                            status: status.toLowerCase()
                        });
                        currentIndex = (currentIndex + 1) % activities.length;
                    }
                } catch (err) {
                    if (!(err instanceof errors.SyntxError)) {
                        new errors.SyntxError({
                            code: errors.ErrorCodes.UNKNOWN,
                            source: SOURCE,
                            message: "Unhandled error while updating the bot's presence.",
                            cause: err,
                        });
                    }
                }
            };
            updatePresence();
            setInterval(updatePresence, time * 1000);
        });
    }

    getActivityType(type) {
        switch (type.toLowerCase()) {
            case 'playing': return ActivityType.Playing;
            case 'streaming': return ActivityType.Streaming;
            case 'listening': return ActivityType.Listening;
            case 'watching': return ActivityType.Watching;
            case 'competing': return ActivityType.Competing;
            default: return ActivityType.Playing;
        }
    }

    registerCommands() {
        if (!this.prefix) {
            errors.missing('prefix', SOURCE, { hint: 'Set a "prefix" in the ERXClient constructor before calling registerCommands().' });
        }

        this.bot.on(Events.MessageCreate, async (msg) => {
            if (msg.author.bot || msg.webhookId || !msg.content.startsWith(this.prefix)) return;

            const args = msg.content.slice(this.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const mainCommand = this.aliases.get(commandName) || commandName;
            const command = this.commands.get(mainCommand);

            if (!command) return;

            try {
                await command(msg);
            } catch (err) {
                // Never throw inside an event listener (it becomes an unhandledRejection).
                if (!(err instanceof errors.SyntxError)) {
                    new errors.SyntxError({
                        code: errors.ErrorCodes.UNKNOWN,
                        source: SOURCE,
                        message: `Unhandled error while executing the "${mainCommand}" command.`,
                        cause: err,
                    });
                }
            }
        });
    }
    
    registerInteractions() {
        this.bot.on(Events.InteractionCreate, async (interaction) => {
            const customId = interaction.customId;
            
            if (interaction.isModalSubmit()) {
                for (const [pattern, handler] of this.modals.entries()) {
                    const regex = new RegExp(`^${pattern}$`);
                    const match = customId.match(regex);
                    if (match) {
                        const dynamicValues = match.groups || {};
                        try {
                            await handler(interaction, dynamicValues, this);
                        } catch (err) {
                            if (!(err instanceof errors.SyntxError)) {
                                new errors.SyntxError({
                                    code: errors.ErrorCodes.UNKNOWN,
                                    source: SOURCE,
                                    message: `Unhandled error while handling the modal "${customId}".`,
                                    cause: err,
                                });
                            }
                        }
                        return;
                    }
                }
                return;
            }
            
            const isAnySelectMenu =
                interaction.isStringSelectMenu?.() ||
                interaction.isUserSelectMenu?.() ||
                interaction.isRoleSelectMenu?.() ||
                interaction.isChannelSelectMenu?.();
            
            if (interaction.isButton() || isAnySelectMenu) {
                for (const [pattern, { content, separator }] of this.interactions.entries()) {
                    const regex = new RegExp(`^${pattern}$`);
                    const match = customId.match(regex);
                    if (match) {
                        const dynamicValues = match.groups || {};
                        try {
                            await content(interaction, dynamicValues, separator);
                        } catch (err) {
                            // Don't throw inside a listener: log it instead of crashing the process.
                            if (!(err instanceof errors.SyntxError)) {
                                new errors.SyntxError({
                                    code: errors.ErrorCodes.UNKNOWN,
                                    source: SOURCE,
                                    message: `Unhandled error while handling the interaction "${customId}".`,
                                    cause: err,
                                });
                            }
                        }
                        return;
                    }
                }
            }
        });
    }
    
    handler({ commands, events, interactions, modals, slash }, showLoad = false) {
        const loadItems = (type, dirPath) => {
            if (!fs.existsSync(dirPath)) {
                if (showLoad) console.log(chalk.red(`Path not found: ${dirPath}`));
                return { failed: 0, loaded: 0 };
            }

            const items = fs.readdirSync(dirPath);
            let failed = 0, loaded = 0;

            for (const file of items) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    const result = loadItems(type, filePath);
                    failed += result.failed;
                    loaded += result.loaded;
                } else if (file.endsWith('.js')) {
                    try {
                        const item = require(filePath);
                        const id = item.id || item.name || file.replace('.js', '');
                        // No se rellena con espacios aquí: handler.js ya se encarga de
                        // alinear la columna, así que solo se le pasa el texto "crudo".
                        const label = `${id} ${chalk.gray(`(${type})`)}`;

                        switch (type) {
                            case 'commands': this.command(item); break;
                            case 'events': this.event(item.event, item.content); break;
                            case 'interactions': this.interaction({ id, content: item.content, separator: item.separator || '-' }); break;
                            case 'modals':
                                if (typeof item.run === 'function') this.modal({ id, run: item.run });
                                else errors.missing('run', SOURCE, { hint: `The modal file "${file}" must export a "run" function.` });
                                break;
                            case 'slash':
                                if (item.data && item.execute) this.slash(item);
                                else errors.usage(`The slash command file "${file}" must export both "data" and "execute".`, SOURCE);
                                break;
                        }

                        if (showLoad) showLoadingStatus(label, "success");
                        loaded++;
                    } catch (err) {
                        failed++;
                        // Always route load failures through the structured logger, even when
                        // showLoad is off, so they still end up in the console/log file.
                        if (!(err instanceof errors.SyntxError)) {
                            new errors.SyntxError({
                                code: errors.ErrorCodes.UNKNOWN,
                                source: SOURCE,
                                message: `Failed to load ${type} file "${file}".`,
                                cause: err,
                            });
                        }
                        if (showLoad) {
                            const label = `${file} ${chalk.red("(error)")}`;
                            showLoadingStatus(label, "error", err.message);
                        }
                    }
                }
            }

            return { failed, loaded };
        };

        if (showLoad) showLoadingStart();

        let totalFailed = 0;
        let totalLoaded = 0;

        if (commands) {
            const result = loadItems('commands', path.resolve(commands));
            totalFailed += result.failed;
            totalLoaded += result.loaded;
        }

        if (events) {
            const result = loadItems('events', path.resolve(events));
            totalFailed += result.failed;
            totalLoaded += result.loaded;
        }

        if (interactions) {
            const result = loadItems('interactions', path.resolve(interactions));
            totalFailed += result.failed;
            totalLoaded += result.loaded;
        }

        if (modals) {
            const result = loadItems('modals', path.resolve(modals));
            totalFailed += result.failed;
            totalLoaded += result.loaded;
        }

        if (slash) {
            const result = loadItems('slash', path.resolve(slash));
            totalFailed += result.failed;
            totalLoaded += result.loaded;
        }

        if (showLoad) showLoadingEnd(totalFailed, totalLoaded);
    }
}

module.exports = ERXClient;