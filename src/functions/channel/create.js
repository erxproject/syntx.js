const { PermissionsBitField, ChannelType } = require("discord.js")

const channelTypes = {
    text: ChannelType.GuildText,
    voice: ChannelType.GuildVoice,
    forum: ChannelType.GuildForum,
    ad: ChannelType.GuildAnnouncement,
    category: ChannelType.GuildCategory
}

// Convierte VIEW_CHANNEL → ViewChannel, SEND_MESSAGES → SendMessages, etc.
function toCamelCase(str) {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^([a-z])/, (_, l) => l.toUpperCase())
}

async function create({ data = {}, permissions = [], returnID = false }, message) {
    if (!message?.guild) {
        throw new Error("Invalid message object: 'message.guild' is required.")
    }

    if (!data?.name) {
        throw new Error("Missing channel name: 'data.name' is required.")
    }

    if (data.type && !channelTypes[data.type]) {
        const valid = Object.keys(channelTypes).join(", ")
        throw new Error(`Invalid channel type '${data.type}'. Valid types are: ${valid}.`)
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
            throw new Error(
                `The following fields cannot be used when creating a category channel: ${forbiddenFields.join(", ")}.`
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
            type: perm.type === "user" ? 1 : 0,
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

    const channel = await message.guild.channels.create(options)
    return returnID ? channel.id : channel
}

module.exports = create