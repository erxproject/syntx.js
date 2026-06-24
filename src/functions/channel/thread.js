const { ChannelType, ThreadAutoArchiveDuration } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.channel.thread"
const threadTypeMap = {
    "public": ChannelType.PublicThread,
    "private": ChannelType.PrivateThread,
    "announcement": ChannelType.AnnouncementThread,
    "GUILD_PUBLIC_THREAD": ChannelType.PublicThread,
    "GUILD_PRIVATE_THREAD": ChannelType.PrivateThread,
    "GUILD_NEWS_THREAD": ChannelType.AnnouncementThread
}

module.exports = async function thread({ channelID, messageID, name, duration, type = ChannelType.PublicThread, returnID = false, content = null }, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }
    if (!channelID) errors.missing("channelID", SOURCE)
    if (!messageID) errors.missing("messageID", SOURCE)
    if (!name) errors.missing("name", SOURCE, { hint: "Provide a name for the thread." })
    if (!duration) errors.missing("duration", SOURCE, { hint: "Provide an auto-archive duration (60, 1440, 4320 or 10080)." })

    const resolvedType = typeof type === "string" ? threadTypeMap[type] : type
    if (resolvedType === undefined || ![ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread].includes(resolvedType)) {
        errors.invalidValue("type", "Invalid thread type provided.", SOURCE, {
            expected: "ChannelType.PublicThread, ChannelType.PrivateThread, or ChannelType.AnnouncementThread",
            received: type
        })
    }

    const channel = await message.guild.channels.fetch(channelID).catch(() => null)
    if (!channel) errors.notFound(`The channel with ID "${channelID}"`, SOURCE)
    
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
        errors.invalidValue("channelID", "Threads can only be started from text or announcement channels.", SOURCE, { received: channel.type })
    }

    const targetMessage = await channel.messages.fetch(messageID).catch(() => null)
    if (!targetMessage) errors.notFound(`The message with ID "${messageID}"`, SOURCE)

    const validDurations = Object.values(ThreadAutoArchiveDuration)
    if (!validDurations.includes(duration)) {
        errors.invalidValue("duration", "Invalid thread auto-archive duration.", SOURCE, {
            expected: "60, 1440, 4320 or 10080",
            received: duration,
        })
    }

    let createdThread
    try {
        createdThread = await targetMessage.startThread({
            name,
            autoArchiveDuration: duration,
            type: resolvedType,
        })
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("create the thread", SOURCE, err, {
            hint: "The bot needs the Create Public/Private Threads permission in that channel.",
        })
    }

    if (!createdThread) errors.api("create the thread", SOURCE, null)

    if (content) {
        try {
            const payload = typeof content === "string" ? { content } : content
            await createdThread.send(payload)
        } catch (err) {
            if (err instanceof errors.SyntxError) throw err
            errors.api("send the initial thread message", SOURCE, err)
        }
    }

    return returnID ? createdThread.id : createdThread
}