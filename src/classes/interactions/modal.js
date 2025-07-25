const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

class Modal {
    constructor({ text, id, options } = {}) {
        if (typeof text !== 'string' || !text.trim()) {
            throw new Error('"text" (title) must be a non-empty string.');
        }

        if (typeof id !== 'string' || !id.trim()) {
            throw new Error('"id" (customId) must be a non-empty string.');
        }

        if (!Array.isArray(options)) {
            throw new Error('"options" must be an array of text input fields.');
        }

        if (options.length === 0 || options.length > 5) {
            throw new Error('You must provide between 1 and 5 input fields.');
        }

        this.modal = new ModalBuilder()
            .setTitle(text.substring(0, 45))
            .setCustomId(id);

        const rows = [];

        for (const field of options) {
            if (!field.id) throw new Error('Each input must have an "id".');
            if (!field.label) throw new Error('Each input must include a "label".');

            const style = field.style?.toLowerCase();
            if (!['short', 'paragraph'].includes(style)) {
                throw new Error(`Invalid style "${style}" for "${field.id}". Use "short" or "paragraph".`);
            }

            const min = typeof field.min === 'number' && field.min >= 1 && field.min <= 3999 ? field.min : 1;
            const max = typeof field.max === 'number' && field.max >= min && field.max <= 4000 ? field.max : 4000;
            const required = typeof field.required === 'boolean' ? field.required : false;
            const placeholder = typeof field.placeholder === 'string' ? field.placeholder : '';
            const value = typeof field.value === 'string' ? field.value : '';

            if (min > max) {
                throw new Error(`"min" cannot be greater than "max" for "${field.id}".`);
            }

            const input = new TextInputBuilder()
                .setCustomId(field.id)
                .setStyle(style === 'short' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                .setLabel(field.label.substring(0, 45))
                .setRequired(required)
                .setMinLength(min)
                .setMaxLength(max);

            if (placeholder) input.setPlaceholder(placeholder);
            if (value) input.setValue(value);

            rows.push(new ActionRowBuilder().addComponents(input));
        }

        this.modal.addComponents(...rows);
    }

    build() {
        return this.modal;
    }
}

module.exports = Modal;