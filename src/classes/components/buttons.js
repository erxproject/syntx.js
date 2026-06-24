const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "Buttons"

const STYLE_MAP = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link,
    premium: ButtonStyle.Premium
}

function resolveStyle(style) {
    if (typeof style === "number") return style
    if (typeof style === "string") {
        const resolved = STYLE_MAP[style.toLowerCase()]
        if (resolved !== undefined) return resolved
    }
    errors.invalidValue("style", `Invalid button style "${style}".`, SOURCE, {
        expected: "Primary, Secondary, Success, Danger, Link, Premium (or a ButtonStyle number)",
        received: style,
    })
}

class Buttons {
    constructor(buttons) {
        if (!Array.isArray(buttons) || buttons.length === 0) {
            errors.invalidValue("buttons", "Buttons expects a non-empty array.", SOURCE, {
                hint: 'Example: new Buttons([{ label: "Hi", style: "Primary", id: "hi" }])',
            })
        }

        this.rows = [[]]

        buttons.forEach((button, index) => {
            if (!button || typeof button !== "object") {
                errors.invalidType(`buttons[${index}]`, "object", button, SOURCE)
            }

            const styleName = (button.style ?? "Primary").toString()
            const isLink = styleName.toLowerCase() === "link"
            const isPremium = styleName.toLowerCase() === "premium" || button.sku !== undefined

            const newButton = new ButtonBuilder().setStyle(resolveStyle(isPremium ? "premium" : styleName))

            if (isPremium) {
                if (!button.sku) {
                    errors.missing(`buttons[${index}].sku`, SOURCE, { hint: "Premium buttons require an sku (SKU id)." })
                }
                newButton.setSKUId(button.sku.toString())
            } else if (isLink) {
                if (!button.url) {
                    errors.missing(`buttons[${index}].url`, SOURCE, { hint: "Link buttons require a url." })
                }
                newButton.setURL(button.url)
                if (button.label) newButton.setLabel(button.label)
                if (button.emoji) newButton.setEmoji(button.emoji)
            } else {
                if (!button.id) {
                    errors.missing(`buttons[${index}].id`, SOURCE, { hint: "Non-link/non-premium buttons require an id (customId)." })
                }
                newButton.setCustomId(button.id)
                if (button.label) newButton.setLabel(button.label)
                if (button.emoji) newButton.setEmoji(button.emoji)
            }

            if (button.disabled !== undefined) {
                newButton.setDisabled(!!button.disabled)
            }

            if (button.row) {
                this.rows.push([newButton])
            } else {
                const currentRow = this.rows[this.rows.length - 1]
                if (currentRow.length >= 5) {
                    this.rows.push([newButton])
                } else {
                    currentRow.push(newButton)
                }
            }
        })

        if (this.rows.length > 5) {
            errors.outOfRange("buttons", "A message can only have up to 5 action rows of buttons.", SOURCE, {
                expected: "<= 5 rows",
                received: this.rows.length,
            })
        }
    }

    build() {
        return this.rows
            .filter(row => row.length > 0)
            .map(row => new ActionRowBuilder().addComponents(row))
    }
}

module.exports = Buttons
