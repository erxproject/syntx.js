const errors = require("../../../../errors")

const SOURCE = "cmd.user.edit.roles.add"

async function addRoles({ user, roles }, message) {
    if (!user) errors.missing("user", SOURCE)
    if (!roles) errors.missing("roles", SOURCE, { hint: "Provide an array of role IDs, e.g. [\"123\", \"456\"]." })
    if (!Array.isArray(roles)) {
        errors.invalidType("roles", "an array of role IDs", roles, SOURCE)
    }
    if (roles.length === 0) {
        errors.invalidValue("roles", "The roles array is empty.", SOURCE, { hint: "Provide at least one role ID." })
    }
    for (const roleID of roles) {
        if (typeof roleID !== "string") {
            errors.invalidType("roles[]", "string role IDs", roleID, SOURCE)
        }
    }

    const guild = message?.guild
    if (!guild) errors.usage("This function must be executed inside a guild.", SOURCE)

    const member = await guild.members.fetch(user).catch(() => null)
    if (!member) errors.notFound("The target user", SOURCE, { hint: "They may have left the guild." })

    for (const roleID of roles) {
        const role = guild.roles.cache.get(roleID)
        if (!role) {
            errors.notFound(`Role with ID "${roleID}"`, SOURCE, { hint: "Check that the role exists in this guild." })
        }

        try {
            await member.roles.add(role)
        } catch (err) {
            if (err instanceof errors.SyntxError) throw err
            errors.api(`add role "${roleID}" to the user`, SOURCE, err, {
                hint: "The bot's role must be above the role it is trying to assign.",
            })
        }
    }
}

module.exports = addRoles