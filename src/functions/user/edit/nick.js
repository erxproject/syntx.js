const errors = require("../../../errors")

const SOURCE = "cmd.user.edit.nick"

async function updateNick({ user, nick } = {}, message) {
    if (!user) errors.missing("user", SOURCE)
    if (nick === undefined) errors.missing("nick", SOURCE, { hint: "Pass a string to set a nickname, or null to reset it." })
    if (!message?.guild) errors.missing("message", SOURCE, { hint: "Pass the Message instance (with a valid guild) as the second argument." })

    const guild = message.guild

    const member = await guild.members.fetch(user.id ?? user).catch(() => null)
    if (!member) errors.notFound("The target user", SOURCE, { hint: "They may not be in this server." })

    try {
        await member.setNickname(nick)
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api(nick === null ? "reset the user's nickname" : "update the user's nickname", SOURCE, err, {
            hint: "The bot needs the Manage Nicknames permission and a higher role than the target.",
        })
    }
}

module.exports = updateNick