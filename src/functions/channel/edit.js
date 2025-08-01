const { PermissionsBitField, ChannelType } = require("discord.js")

function toCamelCase(str) {
    return str.toLowerCase().replace(/_([a-z])/g, (_, l) => l.toUpperCase()).replace(/^([a-z])/, (_, l) => l.toUpperCase())
}

async function editChannel({ channel, data = {}, permissions = [] }, message) {
    if (!message?.guild) throw new Error("Missing 'message.guild'")
    if (!channel) throw new Error("Missing 'channel' to edit")

    const ch = typeof channel === "string"
        ? message.guild.channels.cache.get(channel)
        : channel

    if (!ch) throw new Error("Channel not found")

    const type = ch.type
    
    if ("userLimit" in data && type !== ChannelType.GuildVoice)
        throw new Error("'userLimit' is only valid for voice channels")

    if ("bitrate" in data && type !== ChannelType.GuildVoice)
        throw new Error("'bitrate' is only valid for voice channels")

    if ("cooldown" in data && type !== ChannelType.GuildText)
        throw new Error("'cooldown' is only valid for text channels")

    if ("availableTags" in data && type !== ChannelType.GuildForum)
        throw new Error("'availableTags' is only valid for forum channels")

    if ("appliedTags" in data && type !== ChannelType.GuildForum)
        throw new Error("'appliedTags' is only valid for forum channels")

    const payload = {
        name: data.name,
        topic: data.topic,
        nsfw: data.nsfw,
        rateLimitPerUser: data.cooldown,
        parent: data.category ?? null,
        position: data.position,
        rtcRegion: data.rtcRegion,
        bitrate: data.bitrate,
        userLimit: data.userLimit,
        defaultAutoArchiveDuration: data.autoArchiveDuration,
        availableTags: data.availableTags,
        appliedTags: data.appliedTags,
        reason: data.reason
    }

    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    if (permissions.length) {
        const overwrites = []

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
                if (!bit) throw new Error(`Invalid permission name: ${permName}`)
                if (value) overwrite.allow.push(bit)
                else overwrite.deny.push(bit)
            }

            overwrites.push(overwrite)
        }

        payload.permissionOverwrites = overwrites
    }

    await ch.edit(payload)
    return ch
}

module.exports = editChannel