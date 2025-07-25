async function ban({ user, reason, deleteDays = 0 }, message) {
    try {
        if (!user || !message) throw new Error("Missing required parameters: user or message")

        const member = await message.guild.members.fetch(user).catch(() => null)

        if (!member) {
            return await message.guild.bans.create(user, {
                reason: reason || "No reason provided",
                deleteMessageSeconds: Math.min(deleteDays * 86400, 1209600)
            })
        }

        if (!member.bannable) throw new Error("I don't have permission to ban this user")

        await member.ban({
            reason: reason || "No reason provided",
            deleteMessageSeconds: Math.min(deleteDays * 86400, 1209600)
        })
    } catch (err) {
        throw new Error(`Failed to ban user: ${err.message}`)
    }
}

module.exports = ban