async function userInfo(userID, serverID, client) {
    if (!userID || !serverID || !client) throw new Error("Some parameters are missing.");

    const user = await client.bot.users.fetch(userID, { force: true });
    if (!user) throw new Error("User not found.");

    const fullUser = await user.fetch().catch(() => user);
    const rawUserData = await client.bot.rest.get(`/users/${userID}`).catch(() => ({}));

    const guild = client.bot.guilds.cache.get(serverID);
    if (!guild) throw new Error("Server not found.");

    const member = guild.members.cache.get(userID) || await guild.members.fetch(userID).catch(() => null);
    const ban = await guild.bans.fetch(userID).catch(() => null);

    const presence = member?.presence || null;
    const activities = presence?.activities?.map(activity => ({
        type: activity.type,
        name: activity.name,
        details: activity.details || null,
        state: activity.state || null,
        applicationId: activity.applicationId || null,
        timestamps: activity.timestamps || null,
    })) || null;

    const isTextMuted = member?.communicationDisabledUntilTimestamp > Date.now();
    const isVoiceMuted = member?.voice?.selfMute || member?.voice?.serverMute;

    const global = {
        id: user.id,
        username: user.username,
        displayName: user.tag,
        discriminator: user.discriminator,
        createdAt: user.createdAt,
        flags: user.flags?.toArray() || [],
        avatar: {
            id: user.avatar || null,
            url: fullUser.avatarURL({ dynamic: true, size: 512 }) || null
        },
        decoration: rawUserData?.avatar_decoration_data || null,
        banner: {
            id: fullUser.banner || null,
            url: fullUser.bannerURL({ dynamic: true, size: 1024 }) || null
        },
        application: {
            app: user.bot,
            verified: user.bot && user.flags?.has('VERIFIED_BOT')
        },
        state: presence?.status || 'offline',
        activities: activities
    };

    const guildData = member
        ? {
            id: guild.id,
            nickname: member.nickname || null,
            avatar: {
                id: member.avatar,
                url: member.avatarURL({ dynamic: true, size: 512 }) || null
            } || null,
            roles: member.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor
            })),
            joinedAt: member.joinedAt,
            premiumSince: member.premiumSince,
            permissions: member.permissions.toArray(),
            pending: member.pending,
            communicationDisabledUntil: member.communicationDisabledUntil || null,

            // 🆕 Añadidos útiles:
            isOwner: guild.ownerId === userID,
            isAdmin: member.permissions.has('Administrator'),
            boost: member.premiumSince || null,
            serverAvatarDifferent: member.avatar && member.avatar !== user.avatar,
            banner: {
                id: member.banner || null,
                url: member.bannerURL?.({ dynamic: true, size: 1024 }) || null
            } || null,
            mute: {
                voice: {
                    muted: !!isVoiceMuted,
                    self: member.voice?.selfMute || false,
                    server: member.voice?.serverMute || false
                },
                text: {
                    muted: !!isTextMuted,
                    until: member.communicationDisabledUntil || null,
                    remaining: isTextMuted
                        ? member.communicationDisabledUntil.getTime() - Date.now()
                        : 0
                }
            },
            ban: {
                banned: !!ban,
                reason: ban?.reason || null
            },
            description: guild.description || null
        }
        : null;

    return {
        global,
        guild: guildData
    };
}

module.exports = userInfo;