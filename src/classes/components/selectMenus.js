const { ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, UserSelectMenuBuilder, RoleSelectMenuBuilder } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "SelectMenus"

class SelectMenus {
    constructor(menus = []) {
        if (!Array.isArray(menus)) errors.invalidType("menus", "an array of menu definitions", menus, SOURCE)
        this.menus = menus.map(menu => this.createMenu(menu))
    }

    createMenu(menu) {
        const {
            type = "normal",
            menu_id,
            content = null,
            max = 1,
            min = 1,
            fields = []
        } = menu

        if (!menu_id) errors.missing("menu_id", SOURCE, { hint: "Each menu requires a unique menu_id (customId)." })

        let selectMenu

        switch (type) {
            case "user":
                selectMenu = new UserSelectMenuBuilder()
                    .setCustomId(menu_id)
                    .setMinValues(min)
                    .setMaxValues(max)
                break

            case "channel":
                selectMenu = new ChannelSelectMenuBuilder()
                    .setCustomId(menu_id)
                    .setMinValues(min)
                    .setMaxValues(max)
                break

            case "role":
                selectMenu = new RoleSelectMenuBuilder()
                    .setCustomId(menu_id)
                    .setMinValues(min)
                    .setMaxValues(max)
                break

            case "normal":
            default:
                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(menu_id)
                    .setMinValues(min)
                    .setMaxValues(max)
                    .addOptions(fields.map(field => this.createField(field)))
                break
        }

        if (content) {
            selectMenu.setPlaceholder(content)
        }

        const actionRow = new ActionRowBuilder().addComponents(selectMenu)
        return actionRow
    }

    createField(field) {
        const {
            name,
            value,
            description = null,
            default: isDefault = false,
            emoji = null
        } = field

        if (!name || !value) {
            errors.invalidValue("field", 'Each field requires a "name" and a "value".', SOURCE, {
                received: JSON.stringify({ name, value }),
            })
        }

        const option = {
            label: name,
            value: value,
            default: isDefault
        }

        if (description) {
            option.description = description
        }

        if (emoji) {
            option.emoji = emoji
        }

        return option
    }

    build() {
        return this.menus
    }
}

module.exports = SelectMenus
