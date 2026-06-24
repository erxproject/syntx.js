const errors = require("../../errors")

const SOURCE = "cmd.client.id"

module.exports = function id(client) {
    if (!client) errors.missing("client", SOURCE)
    if (!client.bot?.user) {
        errors.invalidValue("client", "The client is not ready yet.", SOURCE, {
            hint: "Call this only after the bot has logged in (inside ready or an event).",
        })
    }

    return client.bot.user.id
}
