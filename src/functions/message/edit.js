module.exports = async function edit({ data: { channel, message }, content, embed, components = [] }, client) {
    if (typeof channel !== 'string') {
        throw new TypeError('Channel must be a string.');
    }

    if (typeof message !== 'string') {
        throw new TypeError('Message ID must be a string.');
    }

    const targetChannel = client.bot.channels.cache.get(channel.toString());

    if (!targetChannel) {
        throw new Error('Channel not found.');
    }

    const targetMessage = await targetChannel.messages.fetch(message.toString());

    if (!targetMessage) {
        throw new Error('Message not found.');
    }

    if (targetMessage.author.id !== client.bot.user.id) {
        throw new Error('It is not possible to edit messages whose author is not this bot.');
    }

    const embedOptions = embed ? {
        title: embed.title,
        url: embed.titleURL || undefined,
        description: embed.description,
        color: embed.color,
        image: embed.image ? { url: embed.image } : undefined,
        thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
        author: embed.author ? { name: embed.author, icon_url: embed.authorIcon, url: embed.authorURL } : undefined,
        footer: embed.footer ? { text: embed.footer, icon_url: embed.footerIcon } : undefined,
        timestamp: embed.timestamp ? new Date() : undefined
    } : undefined;

    // === Optimización para components ===
    const formattedComponents = components.flatMap(row => {
        if (Array.isArray(row)) {
            return row.map(component =>
                typeof component.toJSON === 'function' ? component.toJSON() : component
            );
        } else if (typeof row?.toJSON === 'function') {
            return [row.toJSON()];
        } else if (row?.type === 1 && Array.isArray(row.components)) {
            return [row];
        }
        throw new Error('Invalid component format: Components must be serialized ActionRows or builders.');
    });

    await targetMessage.edit({
        content: content || undefined,
        embeds: embedOptions ? [embedOptions] : undefined,
        components: formattedComponents.length > 0 ? formattedComponents : []
    });
};