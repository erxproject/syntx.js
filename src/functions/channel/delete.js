const errors = require("../../errors")

const SOURCE = "cmd.channel.delete"

async function deleteChannel({ channel, reason }, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }
    if (!channel) errors.missing("channel", SOURCE, { hint: "Provide a channel ID or channel object to delete." })

    const ch = typeof channel === "string" ? message.guild.channels.cache.get(channel) : channel
    if (!ch) {
        errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." })
    }

    try {
        await ch.delete(reason)
        return true
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("delete the channel", SOURCE, err, {
            hint: "The bot needs the Manage Channels permission for this channel.",
        })
    }
}

module.exports = deleteChannel