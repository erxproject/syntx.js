const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "Modal"

class Modal {
    constructor({ text, id, options } = {}) {
        if (typeof text !== "string" || !text.trim()) {
            errors.invalidValue("text", '"text" (title) must be a non-empty string.', SOURCE, { received: text })
        }

        if (typeof id !== "string" || !id.trim()) {
            errors.invalidValue("id", '"id" (customId) must be a non-empty string.', SOURCE, { received: id })
        }

        if (!Array.isArray(options)) {
            errors.invalidType("options", "an array of text input fields", options, SOURCE)
        }

        if (options.length === 0 || options.length > 5) {
            errors.outOfRange("options", "You must provide between 1 and 5 input fields.", SOURCE, {
                expected: "1 - 5",
                received: options.length,
            })
        }

        this.modal = new ModalBuilder()
            .setTitle(text.substring(0, 45))
            .setCustomId(id)

        const rows = []

        for (const field of options) {
            if (!field.id) errors.missing("field.id", SOURCE, { hint: 'Each input must have an "id".' })
            if (!field.label) errors.missing("field.label", SOURCE, { hint: 'Each input must include a "label".' })

            const style = field.style?.toLowerCase()
            if (!["short", "paragraph"].includes(style)) {
                errors.invalidValue("field.style", `Invalid style "${style}" for "${field.id}".`, SOURCE, {
                    expected: '"short" or "paragraph"',
                    received: style,
                })
            }

            const min = typeof field.min === "number" && field.min >= 1 && field.min <= 3999 ? field.min : 1
            const max = typeof field.max === "number" && field.max >= min && field.max <= 4000 ? field.max : 4000
            const required = typeof field.required === "boolean" ? field.required : false
            const placeholder = typeof field.placeholder === "string" ? field.placeholder : ""
            const value = typeof field.value === "string" ? field.value : ""

            if (min > max) {
                errors.outOfRange("field.min", `"min" cannot be greater than "max" for "${field.id}".`, SOURCE, {
                    expected: "min <= max",
                    received: `min=${min}, max=${max}`,
                })
            }

            const input = new TextInputBuilder()
                .setCustomId(field.id)
                .setStyle(style === "short" ? TextInputStyle.Short : TextInputStyle.Paragraph)
                .setLabel(field.label.substring(0, 45))
                .setRequired(required)
                .setMinLength(min)
                .setMaxLength(max)

            if (placeholder) input.setPlaceholder(placeholder)
            if (value) input.setValue(value)

            rows.push(new ActionRowBuilder().addComponents(input))
        }

        this.modal.addComponents(...rows)
    }

    build() {
        return this.modal
    }
}

module.exports = Modal
