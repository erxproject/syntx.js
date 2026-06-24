// It was created in early versions of Syntx.js as an option to get the ID of the current message, but it has always been useless.
const errors = require("../../errors")

const SOURCE = "cmd.message.id"

module.exports = function messageId(message) {
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message object as the only argument." })
    return message.id
}