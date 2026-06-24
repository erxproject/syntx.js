const { ActionRowBuilder, ButtonBuilder } = require("discord.js")
const errors = require("../../../errors")

const SOURCE = "cmd.message.edit.buttons"

module.exports = async function editButtons(buttonsData, msg) {
    if (!Array.isArray(buttonsData) || buttonsData.length === 0) {
        errors.invalidValue("buttons", "You must provide an array with at least one button.", SOURCE, {
            hint: 'Example: [{ id: "confirm", label: "Done", disabled: true }]',
        })
    }

    const message = msg?.message ?? msg
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message or interaction as the second argument." })
    if (!message.components?.length) {
        errors.notFound("Message components", SOURCE, { hint: "The target message has no buttons to edit." })
    }

    const buttonsMap = new Map(buttonsData.map(b => [b.id, b]))

    const updatedRows = message.components.map((row) => {
        const newRow = new ActionRowBuilder()

        const newButtons = row.components.map((component) => {
            const buttonData = buttonsMap.get(component.customId)
            const newButton = ButtonBuilder.from(component)

            if (buttonData) {
                if (buttonData.label !== undefined) newButton.setLabel(buttonData.label)
                if (buttonData.style !== undefined) newButton.setStyle(buttonData.style)
                if (buttonData.disabled !== undefined) newButton.setDisabled(buttonData.disabled)
                if (buttonData.emoji !== undefined) newButton.setEmoji(buttonData.emoji)
            }

            return newButton
        })

        newRow.addComponents(newButtons)
        return newRow
    })

    try {
        await message.edit({ components: updatedRows })
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.api("edit the message buttons", SOURCE, err)
    }
}