const errors = require("../../errors")

const SOURCE = "cmd.user.ban"

async function ban({ user, reason, deleteMessageDays = 0 }, message) {
    if (!user) {
        errors.missing("user", SOURCE)
    }

    if (
        !Number.isInteger(deleteMessageDays) ||
        deleteMessageDays < 0 ||
        deleteMessageDays > 7
    ) {
        errors.outOfRange(
            "deleteMessageDays",
            'The "deleteMessageDays" value must be an integer between 0 and 7.',
            SOURCE,
            {
                expected: "0 - 7",
                received: deleteMessageDays,
            }
        )
    }

    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Bans only work on server messages/interactions, not in DMs.",
        })
    }

    const userID = user.id ?? user
    const deleteMessageSeconds = deleteMessageDays * 86400

    try {
        const member = await message.guild.members.fetch(userID).catch(() => null)

        if (!member) {
            return await message.guild.bans.create(userID, {
                reason,
                deleteMessageSeconds,
            })
        }

        if (!member.bannable) {
            errors.permissions("ban this user", SOURCE, {
                hint: "Make sure the bot's role is above the target's highest role and has the Ban Members permission.",
            })
        }

        return await member.ban({
            reason,
            deleteMessageSeconds,
        })
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("ban the user", SOURCE, err)
    }
}

module.exports = ban