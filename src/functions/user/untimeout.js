const errors = require("../../errors")

const SOURCE = "cmd.user.untimeout"

async function untimeout({ user, reason }, message) {
    if (!user) errors.missing("user", SOURCE)
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message/interaction object as the second argument." })
    if (!message.guild) errors.usage("This function can only be used inside a guild.", SOURCE)

    const member = await message.guild.members.fetch(user).catch(() => null)
    if (!member) errors.notFound("The target user", SOURCE, { hint: "They may have left the guild." })

    if (!member.moderatable) {
        errors.permissions("remove the timeout from this user", SOURCE, {
            hint: "Make sure the bot's role is above the target's highest role and has the Moderate Members permission.",
        })
    }

    try {
        await member.timeout(null, reason)
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("remove the timeout from the user", SOURCE, err)
    }
}

module.exports = untimeout