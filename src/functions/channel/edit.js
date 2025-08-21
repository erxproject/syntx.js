const { PermissionsBitField, ChannelType } = require("discord.js")

function toCamelCase(str) {
    return str.toLowerCase()
        .replace(/_([a-z])/g, (_, l) => l.toUpperCase())
        .replace(/^([a-z])/, (_, l) => l.toUpperCase())
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
        name: data.name ?? ch.name,
        topic: data.topic ?? ch.topic,
        nsfw: data.nsfw ?? ch.nsfw,
        rateLimitPerUser: data.cooldown ?? ch.rateLimitPerUser,
        parent: data.category ?? ch.parentId ?? null,
        position: data.position ?? ch.rawPosition,
        rtcRegion: data.rtcRegion ?? ch.rtcRegion,
        bitrate: data.bitrate ?? ch.bitrate,
        userLimit: data.userLimit ?? ch.userLimit,
        defaultAutoArchiveDuration: data.autoArchiveDuration ?? ch.defaultAutoArchiveDuration,
        availableTags: data.availableTags ?? ch.availableTags?.map(t => t.id),
        appliedTags: data.appliedTags ?? ch.appliedTags,
        reason: data.reason
    }

    if (permissions.length) {
        const currentOverwrites = ch.permissionOverwrites.cache.map(po => ({
            id: po.id,
            type: po.type,
            allow: new PermissionsBitField(po.allow).bitfield,
            deny: new PermissionsBitField(po.deny).bitfield
        }))

        for (const perm of permissions) {
            if (!perm.id || !perm.type || typeof perm.permissions !== "object") continue

            const targetId = perm.id === "everyone" ? message.guild.id : perm.id
            let existing = currentOverwrites.find(o => o.id === targetId && o.type === (perm.type === "user" ? 1 : 0))

            if (!existing) {
                existing = {
                    id: targetId,
                    type: perm.type === "user" ? 1 : 0,
                    allow: 0n,
                    deny: 0n
                }
                currentOverwrites.push(existing)
            }

            for (const [permName, value] of Object.entries(perm.permissions)) {
                const key = toCamelCase(permName)
                const bit = PermissionsBitField.Flags[key]
                if (!bit) throw new Error(`Invalid permission name: ${permName}`)

                if (value === true) {
                    existing.allow |= bit
                    existing.deny &= ~bit
                } else if (value === false) {
                    existing.deny |= bit
                    existing.allow &= ~bit
                } else {
                    existing.allow &= ~bit
                    existing.deny &= ~bit
                }
            }
        }

        payload.permissionOverwrites = currentOverwrites.map(o => ({
            id: o.id,
            type: o.type,
            allow: new PermissionsBitField(o.allow),
            deny: new PermissionsBitField(o.deny)
        }))
    }

    await ch.edit(payload)
    return ch
}

module.exports = editChannel