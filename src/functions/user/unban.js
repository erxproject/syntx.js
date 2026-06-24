const errors = require("../../errors")

const SOURCE = "cmd.user.unban"

async function unban({ user, reason }, message) {
    if (!user) errors.missing("user", SOURCE)
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message/interaction object as the second argument." })
    if (!message.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE)
    }

    try {
        const banList = await message.guild.bans.fetch()
        const bannedUser = banList.get(user)

        if (!bannedUser) {
            errors.notFound(`A ban for user "${user}"`, SOURCE, {
                hint: "The user is not currently banned in this guild.",
            })
        }

        await message.guild.members.unban(user, reason || "No reason provided")
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("unban the user", SOURCE, err)
    }
}

module.exports = unban
