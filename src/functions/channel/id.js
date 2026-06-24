const errors = require("../../errors")

const SOURCE = "cmd.channel.id"

module.exports = function channelId(message) {
    errors.deprecated(SOURCE, { replacement: "message.channel.id" })
    if (!message) errors.missing("message", SOURCE)
    if (!message.channel) {
        errors.notFound("The channel", SOURCE, { hint: "The provided message object has no channel attached." })
    }

    return message.channel.id
}