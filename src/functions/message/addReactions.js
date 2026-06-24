const errors = require("../../errors")

const SOURCE = "cmd.message.addReactions"

module.exports = async function addReactions(
    { channel, messageID, reactions },
    message
) {
    if (!message?.client) {
        errors.usage(
            "A valid message or interaction context must be passed as the second argument.",
            SOURCE
        )
    }

    if (!channel) errors.missing("channel", SOURCE)
    if (typeof channel !== "string") errors.invalidType("channel", "string", channel, SOURCE)

    if (!messageID) errors.missing("messageID", SOURCE)
    if (typeof messageID !== "string") errors.invalidType("messageID", "string", messageID, SOURCE)

    if (!Array.isArray(reactions) || reactions.length === 0) {
        errors.invalidValue(
            "reactions",
            "Reactions must be a non-empty array of emojis.",
            SOURCE,
            {
                hint: 'Example: ["👍", "👎", "<:custom:123>"]',
            }
        )
    }

    const { client } = message

    let targetChannel =
        channel === message.channelId
            ? message.channel
            : client.channels.cache.get(channel)

    if (!targetChannel) {
        try {
            targetChannel = await client.channels.fetch(channel)
        } catch (err) {
            errors.notFound("The channel", SOURCE, {
                hint: "Check the channel ID and that the bot can see it.",
                details: err?.message,
            })
        }
    }

    if (!targetChannel?.isTextBased()) {
        errors.invalidValue(
            "channel",
            "The specified channel is not a text-based channel.",
            SOURCE,
            { received: targetChannel?.type }
        )
    }

    let targetMessage =
        messageID === message.id
            ? message
            : targetChannel.messages.cache.get(messageID)

    if (!targetMessage) {
        try {
            targetMessage = await targetChannel.messages.fetch(messageID)
        } catch (err) {
            errors.notFound("The message", SOURCE, {
                hint: "Check the message ID and that it exists in that channel.",
                details: err?.message,
            })
        }
    }

    try {
        for (const reaction of reactions.filter(Boolean)) {
            await targetMessage.react(reaction)
        }
    } catch (err) {
        errors.api("add one or more reactions", SOURCE, err, {
            hint: "Make sure emojis are valid and the bot has Add Reactions permission.",
        })
    }

    return targetMessage
}