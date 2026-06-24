const ms = require("ms")
const errors = require("../../errors")

const SOURCE = "cmd.user.timeout"

async function timeout({ user, time, reason }, message) {
    if (!user) errors.missing("user", SOURCE)
    if (!time) errors.missing("time", SOURCE, { hint: 'Provide a duration string like "10m", "1h" or "7d".' })
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message/interaction object as the second argument." })

    if (typeof time !== "string" && typeof time !== "number") {
        errors.invalidType("time", 'a duration string like "10m" or a number of ms', time, SOURCE)
    }

    const duration = ms(time)
    if (!duration) {
        errors.invalidValue("time", `"${time}" is not a valid duration.`, SOURCE, {
            hint: 'Use a format ms() understands, e.g. "30s", "10m", "1h", "7d".',
            received: time,
        })
    }
    if (duration > 2.419e9) {
        errors.outOfRange("time", "A timeout cannot last longer than 28 days.", SOURCE, {
            expected: "<= 28 days",
            received: time,
        })
    }

    if (!message.guild) errors.usage("This function can only be used inside a guild.", SOURCE)

    const member = await message.guild.members.fetch(user).catch(() => null)
    if (!member) errors.notFound("The target user", SOURCE, { hint: "They may have left the guild." })

    if (!member.moderatable) {
        errors.permissions("timeout this user", SOURCE, {
            hint: "Make sure the bot's role is above the target's highest role and has the Moderate Members permission.",
        })
    }

    try {
        await member.timeout(duration, reason)
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("timeout the user", SOURCE, err)
    }
}

module.exports = timeout