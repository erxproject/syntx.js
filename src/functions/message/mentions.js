const errors = require("../../errors")

const SOURCE = "cmd.message.mentions"

module.exports = async function mentions({ channel, message } = {}, msg) {
    if (!channel) errors.missing("channel", SOURCE)
    if (!message) errors.missing("message", SOURCE)
    if (!msg) errors.missing("msg", SOURCE, { hint: "Pass the message/interaction object as the second argument." })

    const textChannel = await msg.client.channels.fetch(channel).catch(() => null)
    if (!textChannel) {
        errors.notFound(`The channel with ID "${channel}"`, SOURCE, {
            hint: "Check that the channel ID is correct and the bot has access to it.",
        })
    }

    const fetchedMessage = await textChannel.messages.fetch(message).catch(() => null)
    if (!fetchedMessage) {
        errors.notFound(`The message with ID "${message}"`, SOURCE, {
            hint: "Check that the message ID is correct and belongs to the provided channel.",
        })
    }

    const mentionedUsers = fetchedMessage.mentions.users
    const mentionedChannels = fetchedMessage.mentions.channels
    const mentionedRoles = fetchedMessage.mentions.roles

    const users = mentionedUsers && mentionedUsers.size > 0
        ? Array.from(mentionedUsers.values()).map(u => u.id)
        : null

    const channels = mentionedChannels && mentionedChannels.size > 0
        ? Array.from(mentionedChannels.values()).map(c => c.id)
        : null

    const roles = mentionedRoles && mentionedRoles.size > 0
        ? Array.from(mentionedRoles.values()).map(r => r.id)
        : null

    return { users, channels, roles }
}