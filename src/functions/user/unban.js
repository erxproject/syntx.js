async function unban({ user, reason }, message) {
    try {
        if (!user || !message) throw new Error("Missing required parameters: user or message")

        const banList = await message.guild.bans.fetch()
        const bannedUser = banList.get(user)

        if (!bannedUser) throw new Error("User is not banned")

        await message.guild.members.unban(user, reason || "No reason provided")
    } catch (err) {
        throw new Error(`Failed to unban user: ${err.message}`)
    }
}

module.exports = unban