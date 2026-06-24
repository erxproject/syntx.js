const errors = require("../../errors")

const SOURCE = "cmd.role.info"

async function roleInfo(role, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }
    if (!role) errors.missing("role", SOURCE, { hint: "Provide a role ID to look up." })

    const guild = message.guild
    const rolei = guild.roles.cache.get(role)
    if (!rolei) errors.notFound(`The role with ID "${role}"`, SOURCE, { hint: "Check that the role exists in this guild." })

    const colors = rolei.colors
    let colorStyle = "solid"
    if (colors.tertiaryColor != null) colorStyle = "holographic"
    else if (colors.secondaryColor != null) colorStyle = "gradient"

    const roleData = {
        id: rolei.id,
        name: rolei.name,
        color: rolei.hexColor,
        colorStyle,
        colors: {
            primary: colors.primaryColor,
            secondary: colors.secondaryColor,
            tertiary: colors.tertiaryColor
        },
        icon: rolei.icon ? rolei.iconURL({ dynamic: true, size: 512 }) : null,
        unicodeEmoji: rolei.unicodeEmoji || null,
        position: rolei.position,
        permissions: rolei.permissions.toArray(),
        hoist: rolei.hoist,
        mentionable: rolei.mentionable,
        managed: rolei.managed,
        editable: rolei.editable,
        flags: rolei.flags.toArray(),
        tags: rolei.tags ? {
            botId: rolei.tags.botId || null,
            integrationId: rolei.tags.integrationId || null,
            premiumSubscriberRole: !!rolei.tags.premiumSubscriberRole,
            subscriptionListingId: rolei.tags.subscriptionListingId || null,
            availableForPurchase: !!rolei.tags.availableForPurchase,
            guildConnections: !!rolei.tags.guildConnections
        } : null,
        assignedMembers: guild.members.cache.filter(member => member.roles.cache.has(rolei.id)).size,
        createdAt: rolei.createdAt
    }

    return roleData
}

module.exports = roleInfo