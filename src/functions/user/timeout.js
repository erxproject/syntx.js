const ms = require("ms")

async function timeout({ user, time, reason }, message) {
    if (!user || !time || !message) throw new Error("Missing required parameters: user, time, or message")

    const duration = ms(time)
    if (!duration || duration > 2.419e9) throw new Error("Invalid time format or duration exceeds 28 days")

    const member = await message.guild.members.fetch(user).catch(() => null)
    if (!member) throw new Error("User not found in this guild")

    if (!member.moderatable) throw new Error("Cannot timeout this user")

    await member.timeout(duration, reason || "The reason was not specified.").catch(() => {
        throw new Error("Failed to timeout the user")
    })
}

module.exports = timeout