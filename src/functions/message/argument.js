// This feature was created in one of the early test versions we made for Syntx.js. It will not be removed, but it can be considered obsolete.
const errors = require("../../errors")

const SOURCE = "cmd.message.argument"

module.exports = function argument(index, msg) {
    if (!msg) errors.missing("msg", SOURCE, { hint: "Pass the message object as the first argument." })
    if (typeof msg.content !== "string") {
        errors.invalidValue("msg", "The message has no text content.", SOURCE)
    }

    const prefix = msg.client.prefix || ""
    if (!msg.content.startsWith(prefix)) {
        errors.usage("The message does not start with the configured prefix.", SOURCE, {
            expected: `a message starting with "${prefix}"`,
            received: msg.content,
        })
    }

    const args = msg.content.slice(prefix.length).trim().split(/ +/)
    return args[index] || null
}
