async function deleteChannel({ channel, reason }, message) {
    if (!message?.guild) throw new Error("Missing 'message.guild'")
    if (!channel) throw new Error("Missing 'channel' to delete")

    const ch = typeof channel === "string"
        ? message.guild.channels.cache.get(channel)
        : channel

    if (!ch) throw new Error("Channel not found")

    await ch.delete(reason)
    return true
}

module.exports = deleteChannel