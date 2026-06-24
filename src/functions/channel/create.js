const { PermissionsBitField, ChannelType, OverwriteType } = require("discord.js") // + OverwriteType
const errors = require("../../errors")

const SOURCE = "cmd.channel.create"

const channelTypes = {
    text: ChannelType.GuildText,
    voice: ChannelType.GuildVoice,
    forum: ChannelType.GuildForum,
    ad: ChannelType.GuildAnnouncement,
    category: ChannelType.GuildCategory
}

function toCamelCase(str) {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^([a-z])/, (_, l) => l.toUpperCase())
}

async function create({ data = {}, permissions = [], returnID = false }, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }

    if (!data?.name) {
        errors.missing("data.name", SOURCE, { hint: "Provide a channel name inside the data object." })
    }

    if (data.type && !channelTypes[data.type]) {
        const valid = Object.keys(channelTypes).join(", ")
        errors.invalidValue("data.type", `Invalid channel type "${data.type}".`, SOURCE, {
            expected: valid,
            received: data.type,
        })
    }

    const isCategory = data.type === "category"

    if (isCategory) {
        const forbiddenFields = []
        if (data.category) forbiddenFields.push("category")
        if (data.topic) forbiddenFields.push("topic")
        if (data.nsfw !== undefined) forbiddenFields.push("nsfw")
        if (data.cooldown !== undefined) forbiddenFields.push("cooldown")
        if (data.parent) forbiddenFields.push("parent")
        if (data.rateLimitPerUser !== undefined) forbiddenFields.push("rateLimitPerUser")

        if (forbiddenFields.length > 0) {
            errors.usage(
                `The following fields cannot be used when creating a category channel: ${forbiddenFields.join(", ")}.`,
                SOURCE,
                { hint: "Remove those fields or create a non-category channel." },
            )
        }
    }

    const options = {
        name: data.name,
        type: channelTypes[data.type] ?? ChannelType.GuildText,
        topic: isCategory ? undefined : data.topic,
        nsfw: isCategory ? undefined : (data.nsfw ?? false),
        rateLimitPerUser: isCategory ? undefined : (data.cooldown ?? undefined),
        parent: isCategory ? undefined : (data.category ?? null),
        position: data.position ?? undefined,
        reason: data.reason ?? undefined,
        permissionOverwrites: []
    }

    for (const perm of permissions) {
        if (!perm.id || !perm.type || typeof perm.permissions !== "object") continue

        const isEveryone = perm.id === "everyone"
        const overwrite = {
            id: isEveryone ? message.guild.id : perm.id,
            type: perm.type === "user" ? OverwriteType.Member : OverwriteType.Role, // Era: 1 : 0
            allow: [],
            deny: []
        }

        for (const [permName, value] of Object.entries(perm.permissions)) {
            const key = toCamelCase(permName)
            const bit = PermissionsBitField.Flags[key]
            if (!bit) continue
            if (value) overwrite.allow.push(bit)
            else overwrite.deny.push(bit)
        }

        options.permissionOverwrites.push(overwrite)
    }

    let channel
    try {
        channel = await message.guild.channels.create(options)
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("create the channel", SOURCE, err, {
            hint: "The bot needs the Manage Channels permission in this guild.",
        })
    }

    return returnID ? channel.id : channel
}

module.exports = create