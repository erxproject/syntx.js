const { Constants } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.role.create"

async function createRole({
    name,
    color = null,
    colors = null,
    colorStyle = "solid",
    hoist = false,
    mentionable = false,
    permissions = [],
    icon = null,
    unicodeEmoji = null,
    position = null,
    reason = null
}, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        })
    }
    if (!name) errors.missing("name", SOURCE, { hint: "Provide a name for the role." })

    const guild = message.guild
    const options = { name }

    if (colorStyle === "solid") {
        if (colors?.secondary) {
            errors.invalidValue("colors.secondary", "The 'solid' colorStyle does not accept a secondary color.", SOURCE, {
                hint: "If you want to use multiple colors, change 'colorStyle' to 'gradient'."
            })
        }
        
        const primaryColor = colors?.primary ?? color ?? null

        options.colors = {
            primaryColor,
            secondaryColor: null,
            tertiaryColor: null
        }
    } 
    else if (colorStyle === "gradient") {
        if (!colors?.secondary) {
            errors.missing("colors.secondary", SOURCE, {
                hint: "The 'gradient' style strictly requires a secondary color inside the 'colors' object."
            })
        }
        
        const primaryColor = colors?.primary ?? color
        if (!primaryColor) {
            errors.missing("colors.primary", SOURCE, {
                hint: "The 'gradient' style requires a primary color."
            })
        }

        options.colors = {
            primaryColor,
            secondaryColor: colors.secondary,
            tertiaryColor: null
        }
    } 
    else if (colorStyle === "holographic") {
        if (colors !== null || color !== null) {
            errors.invalidValue("colors", "The 'holographic' colorStyle does not accept custom colors.", SOURCE, {
                hint: "Discord applies the holographic palette automatically. Omit the 'colors' parameter."
            })
        }

        options.colors = {
            primaryColor: Constants.HolographicStyle.Primary,
            secondaryColor: Constants.HolographicStyle.Secondary,
            tertiaryColor: Constants.HolographicStyle.Tertiary
        }
    }

    if (hoist !== null) options.hoist = hoist
    if (mentionable !== null) options.mentionable = mentionable
    if (permissions.length > 0) options.permissions = permissions
    if (icon) options.icon = icon
    if (unicodeEmoji) options.unicodeEmoji = unicodeEmoji
    if (position !== null) options.position = position
    if (reason) options.reason = reason

    let role
    try {
        role = await guild.roles.create(options)
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("create the role", SOURCE, err, {
            hint: "The bot needs Manage Roles permissions and the server must meet the Nitro tier requirements.",
        })
    }

    const roleColors = role.colors
    let returnedColorStyle = "solid"
    if (roleColors?.tertiaryColor != null) returnedColorStyle = "holographic"
    else if (roleColors?.secondaryColor != null) returnedColorStyle = "gradient"

    return {
        id: role.id,
        name: role.name,
        color: role.hexColor,
        colorStyle: returnedColorStyle,
        colors: {
            primary: roleColors?.primaryColor ?? null,
            secondary: roleColors?.secondaryColor ?? null,
            tertiary: roleColors?.tertiaryColor ?? null
        },
        icon: role.icon ? role.iconURL({ dynamic: true, size: 512 }) : null,
        unicodeEmoji: role.unicodeEmoji || null,
        position: role.position,
        permissions: role.permissions.toArray(),
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed,
        editable: role.editable,
        flags: role.flags.toArray(),
        tags: role.tags ? {
            botId: role.tags.botId || null,
            integrationId: role.tags.integrationId || null,
            premiumSubscriberRole: !!role.tags.premiumSubscriberRole,
            subscriptionListingId: role.tags.subscriptionListingId || null,
            availableForPurchase: !!role.tags.availableForPurchase,
            guildConnections: !!role.tags.guildConnections
        } : null,
        createdAt: role.createdAt
    }
}

module.exports = createRole