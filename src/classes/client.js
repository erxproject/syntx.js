const { Client, GatewayIntentBits, Partials, ActivityType, Events } = require('discord.js');
const { showLoadingStart, showLoadingStatus, showLoadingEnd } = require('../loaders/handler');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { Var } = require('./variables');

class ERXClient {
    constructor({ intents, prefix, token, variable = {} }) {
        this.intents = intents;
        this.prefix = prefix;
        this.token = token;
        this.commands = new Map();
        this.aliases = new Map();
        this.interactions = new Map();
        this.modals = new Map();

        this.bot = new Client({
            intents: this.intents,
            partials: [Partials.Channel],
        });

        if (variable.enabled) {
            const variableFolder = variable.folder || './variables';
            if (!fs.existsSync(variableFolder)) {
                if (variable.folder) {
                    console.log(chalk.red(`✖ The folder "${variableFolder}" does not exist.`));
                } else {
                    fs.mkdirSync(variableFolder, { recursive: true });
                    console.log(chalk.green(`✔ Created default variables folder at "${variableFolder}"`));
                }
            }
            this.variableFolder = variableFolder;
        }

        Var.setClient(this);
    }

    new_variable({ name, value }) {
        if (!this.variableFolder) {
            throw new Error('Variable folder is not set. Ensure the "variable" option is configured correctly.');
        }
        new Var({ name, value, folder: this.variableFolder });
    }

    setMaxListeners(max) {
        if (typeof max === 'number') this.bot.setMaxListeners(max);
        else throw new Error('"max" must be a number.');
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
        this.commands.set(name.toLowerCase(), content);
        alias.forEach(alt => this.aliases.set(alt.toLowerCase(), name.toLowerCase()));
    }

    modal({ id, run }) {
        const dynamicPattern = id
            .replace(/\{(.*?)\}/g, `(?<$1>[^-]+)`)
            .replace(/-/g, `\\-`);
        this.modals.set(dynamicPattern, run);
    }

    interaction({ id, content, separator = '-' }) {
        const dynamicPattern = id
            .replace(/\{(.*?)\}/g, `(?<$1>[^${separator}]+)`)
            .replace(new RegExp(`\\${separator}`, 'g'), `\\${separator}`);
        this.interactions.set(dynamicPattern, { content, separator });
    }

    event(name, callback) {
        const eventPath = path.join(__dirname, '../events', `${name}.js`);
        if (fs.existsSync(eventPath)) {
            const event = require(eventPath);
            this.bot.on(event.trigger, async (...args) => {
                if (event.condition(...args)) await callback(...args);
            });
        } else if (Object.values(Events).includes(name)) {
            this.bot.on(name, async (...args) => await callback(...args));
        } else {
            throw new Error(`Event "${name}" not found.`);
        }
    }

    presence({ time, activities, status = 'online' }) {
        if (!Array.isArray(activities) || activities.length === 0) {
            throw new Error('"activities" must be a non-empty array.');
        }

        this.bot.once(Events.ClientReady, () => {
            let currentIndex = 0;
            const updatePresence = () => {
                const activity = activities[currentIndex];
                if (activity) {
                    const type = this.getActivityType(activity.type);
                    this.bot.user.setPresence({
                        activities: [{ name: activity.content, type }],
                        status: status.toLowerCase()
                    });
                    currentIndex = (currentIndex + 1) % activities.length;
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
        this.bot.on(Events.MessageCreate, async (msg) => {
            if (msg.author.bot || msg.webhookId || !msg.content.startsWith(this.prefix)) return;

            const args = msg.content.slice(this.prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            const mainCommand = this.aliases.get(commandName) || commandName;
            const command = this.commands.get(mainCommand);

            if (command) await command(msg);
        });
    }
    
    registerInteractions() {
        this.bot.on(Events.InteractionCreate, async (interaction) => {
            const customId = interaction.customId;
            
            // === MODALS ===
            if (interaction.isModalSubmit()) {
                for (const [pattern, handler] of this.modals.entries()) {
                    const regex = new RegExp(`^${pattern}$`);
                    const match = customId.match(regex);
                    if (match) {
                        const dynamicValues = match.groups || {};
                        try {
                            await handler(interaction, dynamicValues, this);
                            
                        } catch (err) {
                            console.error(`Error in modal "${customId}":`, err);
                            
                        }
                        return;
                    }
                }
                return;
            }
            
            // === INTERACTIONS: BUTTONS & SELECT MENUS ===
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
                            throw new Error(`Error executing interaction "${customId}"`)
                        }
                        return;
                    }
                }
            }
        });
    }

    handler({ commands, events, interactions, modals }, showLoad = false) {
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
                        const label = `${id} ${chalk.gray(`(${type})`)}`.padEnd(50, ' ');

                        switch (type) {
                            case 'commands': this.command(item); break;
                            case 'events': this.event(item.event, item.content); break;
                            case 'interactions': this.interaction({ id, content: item.content, separator: item.separator || '-' }); break;
                            case 'modals':
                                if (typeof item.run === 'function') this.modal({ id, run: item.run });
                                else throw new Error("Missing 'run' function in modal.");
                                break;
                        }

                        if (showLoad) showLoadingStatus(label, "success");
                        loaded++;
                    } catch (err) {
                        failed++;
                        if (showLoad) {
                            const label = `${file} ${chalk.red("(error)")}`.padEnd(50, " ");
                            showLoadingStatus(label, "error");
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

        if (showLoad) showLoadingEnd(totalFailed, totalLoaded);
    }
}

module.exports = ERXClient;