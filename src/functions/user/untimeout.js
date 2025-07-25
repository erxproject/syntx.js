async function untimeout({ user, reason }, message) {
    if (!user || !message) throw new Error("Missing required parameters: user or message")

    const member = await message.guild.members.fetch(user).catch(() => null)
    if (!member) throw new Error("User not found in this guild")

    if (!member.moderatable) throw new Error("Cannot remove timeout from this user")

    await member.timeout(null, reason || "No reason provided").catch(() => {
        throw new Error("Failed to remove timeout from the user")
    })
}

module.exports = untimeout