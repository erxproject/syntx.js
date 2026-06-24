const {
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    FileBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder
} = require("discord.js")
const errors = require("../../errors")

const SOURCE = "Display"

class Display {
    constructor(blocks = []) {
        if (!Array.isArray(blocks)) {
            errors.invalidType("blocks", "an array of component blocks", blocks, SOURCE)
        }

        this.components = blocks.map((block, i) => this._createBlock(block, i))
    }

    _createBlock(block, index) {
        if (!block || typeof block !== "object" || typeof block.type !== "string") {
            errors.invalidValue(`blocks[${index}]`, `Display block #${index + 1} is invalid.`, SOURCE, {
                hint: 'Each block must be an object with a "type" string.',
            })
        }

        switch (block.type.toLowerCase()) {
            case "text":
                return this._buildText(block)
            case "separator":
                return this._buildSeparator(block)
            case "section":
                return this._buildSection(block)
            case "gallery":
                return this._buildGallery(block)
            case "file":
                return this._buildFile(block)
            case "container":
                return this._buildContainer(block)
            case "buttons":
                return this._buildButtonsRow(block)
            case "menu":
                return this._buildMenuRow(block)
            default:
                errors.invalidValue("block.type", `Unsupported Display block type "${block.type}".`, SOURCE, {
                    expected: "text, separator, section, gallery, file, container, buttons, menu",
                    received: block.type,
                })
        }
    }

    _buildText(block) {
        if (typeof block.content !== "string" || !block.content.trim()) {
            errors.invalidValue("block.content", 'A "text" block requires a non-empty "content" string.', SOURCE)
        }
        const text = new TextDisplayBuilder().setContent(block.content)
        if (block.id !== undefined) text.setId(block.id)
        return text
    }

    _buildSeparator(block) {
        const separator = new SeparatorBuilder()
        if (block.divider !== undefined) separator.setDivider(!!block.divider)
        const spacing = (block.spacing || "small").toString().toLowerCase()
        separator.setSpacing(spacing === "large" ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small)
        if (block.id !== undefined) separator.setId(block.id)
        return separator
    }

    _buildSection(block) {
        const section = new SectionBuilder()

        const lines = Array.isArray(block.content) ? block.content : [block.content]
        const cleanLines = lines.filter(line => typeof line === "string" && line.length > 0)

        if (cleanLines.length === 0) {
            errors.invalidValue("block.content", 'A "section" block requires "content" (a string or an array of 1-3 strings).', SOURCE)
        }
        if (cleanLines.length > 3) {
            errors.outOfRange("block.content", 'A "section" block accepts at most 3 text lines.', SOURCE, {
                expected: "<= 3 lines",
                received: cleanLines.length,
            })
        }

        for (const line of cleanLines) {
            section.addTextDisplayComponents(t => t.setContent(line))
        }

        if (block.button && block.thumbnail) {
            errors.usage('A "section" can only have ONE accessory: either "button" or "thumbnail", not both.', SOURCE)
        }

        if (block.button) {
            section.setButtonAccessory(b => this._applyButton(b, block.button))
        } else if (block.thumbnail) {
            const thumb = block.thumbnail
            if (!thumb.url) errors.missing("thumbnail.url", SOURCE, { hint: 'A section "thumbnail" requires a "url".' })
            section.setThumbnailAccessory(t => {
                t.setURL(thumb.url)
                if (thumb.description) t.setDescription(thumb.description)
                if (thumb.spoiler !== undefined) t.setSpoiler(!!thumb.spoiler)
                return t
            })
        } else {
            errors.usage('A "section" block requires an accessory: provide "button" or "thumbnail".', SOURCE, {
                hint: 'For plain text use a "text" block instead.',
            })
        }

        if (block.id !== undefined) section.setId(block.id)
        return section
    }

    _buildGallery(block) {
        if (!Array.isArray(block.items) || block.items.length === 0) {
            errors.invalidValue("block.items", 'A "gallery" block requires a non-empty "items" array.', SOURCE)
        }
        if (block.items.length > 10) {
            errors.outOfRange("block.items", 'A "gallery" block accepts at most 10 items.', SOURCE, {
                expected: "<= 10",
                received: block.items.length,
            })
        }

        const gallery = new MediaGalleryBuilder()
        for (const item of block.items) {
            if (!item || !item.url) errors.missing("gallery.item.url", SOURCE, { hint: 'Each gallery item requires a "url".' })
            const mediaItem = new MediaGalleryItemBuilder().setURL(item.url)
            if (item.description) mediaItem.setDescription(item.description)
            if (item.spoiler !== undefined) mediaItem.setSpoiler(!!item.spoiler)
            gallery.addItems(mediaItem)
        }
        if (block.id !== undefined) gallery.setId(block.id)
        return gallery
    }

    _buildFile(block) {
        if (!block.url || typeof block.url !== "string") {
            errors.invalidValue("block.url", 'A "file" block requires a "url" (usually "attachment://filename.ext").', SOURCE)
        }
        const file = new FileBuilder().setURL(block.url)
        if (block.spoiler !== undefined) file.setSpoiler(!!block.spoiler)
        if (block.id !== undefined) file.setId(block.id)
        return file
    }

    _buildContainer(block) {
        if (!Array.isArray(block.components) || block.components.length === 0) {
            errors.invalidValue("block.components", 'A "container" block requires a non-empty "components" array.', SOURCE)
        }

        const container = new ContainerBuilder()
        if (block.color !== undefined) container.setAccentColor(block.color)
        if (block.spoiler !== undefined) container.setSpoiler(!!block.spoiler)
        if (block.id !== undefined) container.setId(block.id)

        for (const child of block.components) {
            const built = this._createBlock(child, 0)
            const type = (child.type || "").toLowerCase()

            switch (type) {
                case "text":
                    container.addTextDisplayComponents(built)
                    break
                case "separator":
                    container.addSeparatorComponents(built)
                    break
                case "section":
                    container.addSectionComponents(built)
                    break
                case "gallery":
                    container.addMediaGalleryComponents(built)
                    break
                case "file":
                    container.addFileComponents(built)
                    break
                case "buttons":
                case "menu":
                    container.addActionRowComponents(built)
                    break
                default:
                    errors.usage(`A "container" cannot hold a "${child.type}" block.`, SOURCE, {
                        hint: "Containers cannot be nested inside containers.",
                    })
            }
        }

        return container
    }

    _buildButtonsRow(block) {
        if (!Array.isArray(block.buttons) || block.buttons.length === 0) {
            errors.invalidValue("block.buttons", 'A "buttons" block requires a non-empty "buttons" array.', SOURCE)
        }
        const row = new ActionRowBuilder()
        for (const def of block.buttons) {
            row.addComponents(this._applyButton(new ButtonBuilder(), def))
        }
        return row
    }

    _buildMenuRow(block) {
        const menu = block.menu || block
        const type = (menu.menu_type || menu.kind || "normal").toString().toLowerCase()
        if (!menu.menu_id) errors.missing("menu.menu_id", SOURCE, { hint: 'A "menu" block requires a "menu_id".' })

        let select
        switch (type) {
            case "user":
                select = new UserSelectMenuBuilder().setCustomId(menu.menu_id)
                break
            case "role":
                select = new RoleSelectMenuBuilder().setCustomId(menu.menu_id)
                break
            case "channel":
                select = new ChannelSelectMenuBuilder().setCustomId(menu.menu_id)
                break
            case "normal":
            default:
                select = new StringSelectMenuBuilder().setCustomId(menu.menu_id)
                if (Array.isArray(menu.fields)) {
                    select.addOptions(menu.fields.map(f => {
                        if (!f.name || !f.value) errors.invalidValue("menu.field", 'Each menu field requires "name" and "value".', SOURCE)
                        const opt = { label: f.name, value: f.value, default: !!f.default }
                        if (f.description) opt.description = f.description
                        if (f.emoji) opt.emoji = f.emoji
                        return opt
                    }))
                }
                break
        }

        if (menu.content) select.setPlaceholder(menu.content)
        if (menu.min !== undefined) select.setMinValues(menu.min)
        if (menu.max !== undefined) select.setMaxValues(menu.max)

        return new ActionRowBuilder().addComponents(select)
    }

    _applyButton(builder, def) {
        if (!def || typeof def !== "object") errors.invalidType("button", "object", def, SOURCE)

        const styleName = (def.style || "Primary").toString()
        const premiumStyle = ButtonStyle.Premium

        if (styleName.toLowerCase() === "premium" || def.sku) {
            if (!def.sku) errors.missing("button.sku", SOURCE, { hint: "Premium buttons require an sku (SKU id)." })
            if (premiumStyle === undefined) {
                errors.usage("Your discord.js version does not support Premium buttons.", SOURCE, { hint: "Update discord.js." })
            }
            builder.setStyle(premiumStyle).setSKUId(def.sku.toString())
            if (def.disabled !== undefined) builder.setDisabled(!!def.disabled)
            return builder
        }

        if (def.label) builder.setLabel(def.label)
        if (def.emoji) builder.setEmoji(def.emoji)
        if (def.disabled !== undefined) builder.setDisabled(!!def.disabled)

        if (styleName === "Link" || styleName.toLowerCase() === "link") {
            if (!def.url) errors.missing("button.url", SOURCE, { hint: "Link buttons require a url." })
            builder.setStyle(ButtonStyle.Link).setURL(def.url)
        } else {
            if (!def.id) errors.missing("button.id", SOURCE, { hint: "Non-link buttons require an id (customId)." })
            builder.setStyle(this._resolveButtonStyle(styleName)).setCustomId(def.id)
        }

        return builder
    }

    _resolveButtonStyle(style) {
        if (typeof style === "number") return style
        const map = {
            primary: ButtonStyle.Primary,
            secondary: ButtonStyle.Secondary,
            success: ButtonStyle.Success,
            danger: ButtonStyle.Danger,
            link: ButtonStyle.Link
        }
        return map[style.toLowerCase()] ?? ButtonStyle.Primary
    }

    build() {
        return this.components
    }
}

module.exports = Display
