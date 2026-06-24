const errors = require("../../errors")

const SOURCE = "cmd.user.info"

async function userInfo(user, message) {
    if (!user) errors.missing("user", SOURCE)
    if (!message?.guild) errors.missing("message", SOURCE, { hint: "Pass the Message instance (with a valid guild) as the second argument." })

    const guild = message.guild

    let fetchedUser
    try {
        fetchedUser = await message.client.users.fetch(user.id ?? user, { force: true })
    } catch (err) {
        errors.notFound(`The user with ID "${user.id ?? user}"`, SOURCE, {
            hint: "Check that the user ID is correct.",
            details: err?.message,
        })
    }
    if (!fetchedUser) errors.notFound("The user", SOURCE)

    const fullUser = await fetchedUser.fetch().catch(() => fetchedUser)
    const rawUserData = await message.client.rest.get(`/users/${fetchedUser.id}`).catch(() => ({}))

    const member = guild.members.cache.get(fetchedUser.id) || await guild.members.fetch(fetchedUser.id).catch(() => null)
    const ban = await guild.bans.fetch(fetchedUser.id).catch(() => null)

    const presence = member?.presence || null
    const activities = presence?.activities?.map(activity => ({
        type: activity.type,
        name: activity.name,
        details: activity.details || null,
        state: activity.state || null,
        applicationId: activity.applicationId || null,
        timestamps: activity.timestamps || null,
        emoji: activity.emoji ? { name: activity.emoji.name, id: activity.emoji.id, animated: activity.emoji.animated } : null,
    })) || null

    const isTextMuted = member?.communicationDisabledUntilTimestamp > Date.now()
    const isVoiceMuted = member?.voice?.selfMute || member?.voice?.serverMute
    const isVoiceDeafened = member?.voice?.selfDeaf || member?.voice?.serverDeaf

    const global = {
        id: fetchedUser.id,
        username: fetchedUser.username,
        displayName: fetchedUser.tag,
        globalName: fetchedUser.globalName || null,
        discriminator: fetchedUser.discriminator,
        createdAt: fetchedUser.createdAt,
        flags: fetchedUser.flags?.toArray() || [],
        avatar: {
            id: fetchedUser.avatar || null,
            url: fullUser.displayAvatarURL({ size: 512 }) || null
        },
        decoration: rawUserData?.avatar_decoration_data || null,
        banner: {
            id: fullUser.banner || null,
            url: fullUser.bannerURL({ size: 1024 }) || null
        },
        application: {
            app: fetchedUser.bot,
            verified: fetchedUser.bot && fetchedUser.flags?.has("VerifiedBot")
        },
        state: presence?.status || "offline",
        activities: activities
    }

    const guildData = member
        ? {
            id: guild.id,
            nickname: member.nickname || null,
            avatar: {
                id: member.avatar || null,
                url: member.avatarURL({ size: 512 }) || null
            },
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
            isOwner: guild.ownerId === fetchedUser.id,
            isAdmin: member.permissions.has("Administrator"),
            boost: member.premiumSince || null,
            serverAvatarDifferent: !!(member.avatar && member.avatar !== fetchedUser.avatar),
            banner: {
                id: member.banner || null,
                url: member.bannerURL?.({ size: 1024 }) || null
            },
            mute: {
                voice: {
                    muted: !!isVoiceMuted,
                    self: member.voice?.selfMute || false,
                    server: member.voice?.serverMute || false
                },
                deaf: {
                    deafened: !!isVoiceDeafened,
                    self: member.voice?.selfDeaf || false,
                    server: member.voice?.serverDeaf || false
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
        : null

    return {
        global,
        guild: guildData
    }
}

module.exports = userInfo