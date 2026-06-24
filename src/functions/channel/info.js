const { ChannelType } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.channel.info"

const channelTypeMap = {
    [ChannelType.GuildText]: "text",
    [ChannelType.GuildVoice]: "voice",
    [ChannelType.GuildForum]: "forum",
    [ChannelType.GuildAnnouncement]: "announcement",
    [ChannelType.GuildCategory]: "category",
    [ChannelType.GuildStageVoice]: "stage",
    [ChannelType.PrivateThread]: "private_thread",
    [ChannelType.PublicThread]: "public_thread",
    [ChannelType.AnnouncementThread]: "announcement_thread",
    [ChannelType.GuildDirectory]: "directory",
    [ChannelType.GuildMedia]: "media"
}

async function channelInfo(channel, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }
    if (!channel) errors.missing("channel", SOURCE, { hint: "Provide a channel ID or channel object." })

    const ch = typeof channel === "string" ? message.guild.channels.cache.get(channel) : channel
    if (!ch) {
        errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." })
    }

    if (ch.guildId && ch.guildId !== message.guild.id) {
        errors.invalidValue("channel", "The provided channel does not belong to this guild.", SOURCE, {
            hint: "Ensure the channel ID or object belongs to the current guild.",
            expected: message.guild.id,
            received: ch.guildId
        })
    }

    const type = channelTypeMap[ch.type] || "unknown"

    const channelData = {
        id: ch.id,
        name: ch.name ?? null,
        type: type,
        position: ch.rawPosition ?? null,
        parentID: ch.parentId ?? null,
        parent: ch.parentId ? { id: ch.parentId, name: ch.parent?.name ?? null } : null,
        flags: ch.flags?.toArray() ?? null,
        createdAt: ch.createdAt ?? null,
        deletable: ch.deletable ?? null,
        manageable: ch.manageable ?? null,
        viewable: ch.viewable ?? null,
        url: ch.url ?? null,
        permissions: ch.permissionOverwrites?.cache.map(perm => ({
            id: perm.id,
            type: perm.type,
            allow: perm.allow.toArray(),
            deny: perm.deny.toArray()
        })) ?? null
    }

    if (["text", "announcement"].includes(type)) {
        Object.assign(channelData, {
            description: ch.topic ?? null,
            nsfw: ch.nsfw ?? false,
            rateLimit: ch.rateLimitPerUser ?? 0,
            lastMessageId: ch.lastMessageId ?? null,
            lastPinAt: ch.lastPinAt ?? null,
            defaultAutoArchiveDuration: ch.defaultAutoArchiveDuration ?? null,
            threads: ch.threads?.cache.map(thread => ({
                id: thread.id,
                name: thread.name,
                ownerId: thread.ownerId,
                createdAt: thread.createdAt,
                archived: thread.archived,
                locked: thread.locked
            })) ?? []
        })
    }

    if (["voice", "stage"].includes(type)) {
        Object.assign(channelData, {
            description: ch.topic ?? null,nsfw: ch.nsfw ?? false,
            rateLimit: ch.rateLimitPerUser ?? 0,
            bitrate: ch.bitrate ?? null,
            userLimit: ch.userLimit ?? null,
            rtcRegion: ch.rtcRegion ?? null,
            videoQualityMode: ch.videoQualityMode ?? null,
            joinable: ch.joinable ?? null,
            full: ch.full ?? null
        })
    }

    if (["forum", "media"].includes(type)) {
        Object.assign(channelData, {
            description: ch.topic ?? null,nsfw: ch.nsfw ?? false,
            defaultAutoArchiveDuration: ch.defaultAutoArchiveDuration ?? null,
            defaultThreadRateLimitPerUser: ch.defaultThreadRateLimitPerUser ?? null,
            defaultForumLayout: ch.defaultForumLayout ?? null,
            defaultSortOrder: ch.defaultSortOrder ?? null,
            defaultReactionEmoji: ch.defaultReactionEmoji ? { id: ch.defaultReactionEmoji.id, name: ch.defaultReactionEmoji.name } : null,
            availableTags: ch.availableTags?.map(tag => ({ 
                id: tag.id, 
                name: tag.name,
                moderated: tag.moderated ?? false,
                emoji: tag.emoji ? { id: tag.emoji.id ?? null, name: tag.emoji.name ?? null } : null
            })) ?? [],
            threads: ch.threads?.cache.map(thread => ({
                id: thread.id,
                name: thread.name,
                ownerId: thread.ownerId,
                createdAt: thread.createdAt,
                archived: thread.archived,
                locked: thread.locked,
                appliedTags: thread.appliedTags ?? []
            })) ?? []
        })
    }

    if (["private_thread", "public_thread", "announcement_thread"].includes(type)) {
        Object.assign(channelData, {
            rateLimit: ch.rateLimitPerUser ?? 0,
            ownerId: ch.ownerId ?? null,
            archived: ch.archived ?? null,
            archivedAt: ch.archivedAt ?? null,
            autoArchiveDuration: ch.autoArchiveDuration ?? null,
            locked: ch.locked ?? null,
            invitable: ch.invitable ?? null,
            joined: ch.joined ?? null,
            unarchivable: ch.unarchivable ?? null,
            memberCount: ch.memberCount ?? null,
            messageCount: ch.messageCount ?? null,
            totalMessageSent: ch.totalMessageSent ?? null,
            permissionsLocked: ch.permissionsLocked ?? null
        })
    }

    return channelData
}

module.exports = channelInfo