const errors = require("../../errors")

const SOURCE = "cmd.client.ping"

module.exports = function ping(client) {
    if (!client) errors.missing("client", SOURCE)
    if (!client.bot?.ws) {
        errors.invalidValue("client", "The client websocket is not available yet.", SOURCE, {
            hint: "Call this only after the bot has logged in.",
        })
    }

    return client.bot.ws.ping
}