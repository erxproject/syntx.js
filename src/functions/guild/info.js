const errors = require("../../errors")

const SOURCE = "cmd.guild.info"

async function serverInfo(message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the only argument.",
        })
    }

    const guild = message.guild

    let owner
    let invites
    let vanityData
    try {
        owner = await guild.fetchOwner()
        invites = await guild.invites.fetch().catch(() => [])
        vanityData = guild.vanityURLCode ? await guild.fetchVanityData().catch(() => null) : null
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("fetch the guild information", SOURCE, err)
    }

    const permanentInvite = invites.find(inv => !inv.expiresAt)?.url || null

    const serverData = {
        id: guild.id,
        name: guild.name,
        nameAcronym: guild.nameAcronym,
        icon: {
            id: guild.icon,
            url: guild.iconURL({ dynamic: true, size: 512 })
        },
        ownerId: owner.id,
        applicationId: guild.applicationId || null,
        available: guild.available,
        large: guild.large,
        verified: guild.verified,
        partnered: guild.partnered,
        boostCount: guild.premiumSubscriptionCount,
        boostLevel: guild.premiumTier,
        premiumProgressBarEnabled: guild.premiumProgressBarEnabled,
        verificationLevel: guild.verificationLevel,
        explicitContentFilter: guild.explicitContentFilter,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        mfaLevel: guild.mfaLevel,
        nsfwLevel: guild.nsfwLevel,
        emojis: guild.emojis.cache.map(emoji => ({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            url: emoji.imageURL({ extension: emoji.animated ? "gif" : "png" })
        })),
        stickers: guild.stickers.cache.map(sticker => ({
            id: sticker.id,
            name: sticker.name,
            description: sticker.description,
            tags: sticker.tags,
            format: sticker.format,
            available: sticker.available,
            url: sticker.url
        })),
        roleCount: guild.roles.cache.size,
        roles: guild.roles.cache.map(role => {
            const colors = role.colors
            let colorStyle = "solid"
            if (colors.tertiaryColor != null) colorStyle = "holographic"
            else if (colors.secondaryColor != null) colorStyle = "gradient"
            return {
                id: role.id,
                name: role.name,
                color: role.hexColor,
                colorStyle,
                colors: {
                    primary: colors.primaryColor,
                    secondary: colors.secondaryColor,
                    tertiary: colors.tertiaryColor
                },
                icon: role.icon ? role.iconURL({ dynamic: true, size: 512 }) : null,
                unicodeEmoji: role.unicodeEmoji || null,
                permissions: role.permissions.toArray(),
                hoist: role.hoist,
                position: role.position,
                mentionable: role.mentionable,
                managed: role.managed,
                editable: role.editable,
                flags: role.flags.toArray(),
                assignedMembers: guild.members.cache.filter(member => member.roles.cache.has(role.id)).size
            }
        }),
        channelCount: guild.channels.cache.size,
        description: guild.description || null,
        banner: guild.bannerURL({ dynamic: true, size: 512 }) || null,
        splash: guild.splashURL({ dynamic: true, size: 512 }) || null,
        discoverySplash: guild.discoverySplashURL({ dynamic: true, size: 512 }) || null,
        memberCount: guild.memberCount,
        approximateMemberCount: guild.approximateMemberCount || null,
        approximatePresenceCount: guild.approximatePresenceCount || null,
        maximumMembers: guild.maximumMembers || null,
        maximumPresences: guild.maximumPresences || null,
        maximumBitrate: guild.maximumBitrate,
        maxVideoChannelUsers: guild.maxVideoChannelUsers || null,
        maxStageVideoChannelUsers: guild.maxStageVideoChannelUsers || null,
        joinedAt: guild.joinedAt,
        createdAt: guild.createdAt,
        shardId: guild.shardId,
        features: guild.features,
        systemChannel: guild.systemChannel?.id || null,
        afkChannel: guild.afkChannel?.id || null,
        afkTimeout: guild.afkTimeout || null,
        widgetEnabled: guild.widgetEnabled,
        widgetChannel: guild.widgetChannel?.id || null,
        rulesChannel: guild.rulesChannel?.id || null,
        publicUpdatesChannel: guild.publicUpdatesChannel?.id || null,
        safetyAlertsChannel: guild.safetyAlertsChannel?.id || null,
        preferredLocale: guild.preferredLocale,
        vanityURLCode: guild.vanityURLCode || null,
        vanityURLUses: vanityData?.uses ?? null,
        permanentInvite: permanentInvite,
        incidentsData: guild.incidentsData || null
    }

    return serverData
}

module.exports = serverInfo