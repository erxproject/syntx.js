// This feature was created in one of the early test versions we made for Syntx.js. It will not be removed, but it can be considered obsolete.
const errors = require("../../errors")

const SOURCE = "cmd.message.content"

module.exports = function content(message, firstArgument = false) {
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message object as the first argument." })

    if (message.content) {
        const words = message.content.split(" ")
        return firstArgument ? words.join(" ") : words.slice(1).join(" ")
    }

    return ""
}