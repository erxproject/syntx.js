async function addRoles({ user, roles }, message) {
    if (!user) {
        throw new Error("Parameter 'user' is required.");
    }

    if (!roles || !Array.isArray(roles)) {
        throw new Error("Parameter 'roles' must be an array of role IDs.");
    }

    if (roles.length === 0) {
        throw new Error("Roles array is empty. Provide at least one role ID.");
    }

    for (const roleID of roles) {
        if (typeof roleID !== "string") {
            throw new Error("All role IDs in 'roles' array must be strings.");
        }
    }

    const guild = message.guild;
    if (!guild) {
        throw new Error("This function must be executed inside a guild.");
    }

    const member = await guild.members.fetch(user).catch(() => null);
    if (!member) {
        throw new Error("User not found in this guild.");
    }

    for (const roleID of roles) {
        const role = guild.roles.cache.get(roleID);
        if (!role) {
            throw new Error(`Role with ID "${roleID}" does not exist in this guild.`);
        }

        try {
            await member.roles.add(role);
        } catch (err) {
            throw new Error(`Failed to add role "${roleID}" to user: ${err.message}`);
        }
    }
}

module.exports = addRoles;