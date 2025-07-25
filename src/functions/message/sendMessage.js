module.exports = async function send(
    {
        text,
        channel,
        returnId = false,
        components = [],
        files = [],
        ephemeral = false,
        options: { reply = false, ping = true } = {}
    },
    message
) {
    if (typeof text !== 'string' && typeof text !== 'object') {
        throw new Error('Text must be a string or an object');
    }

    if (channel && typeof channel !== 'string') {
        throw new Error('Channel must be a string');
    }

    const isInteraction = typeof message.user !== 'undefined';

    if (ephemeral && (!isInteraction || !reply)) {
        throw new Error('Ephemeral messages can only be sent as replies to interactions');
    }

    const userId = message.author?.id || message.user?.id;
    if (!userId) {
        throw new Error('Could not determine user ID');
    }

    const targetChannel = channel
        ? message.client.channels.cache.get(channel.toString())
        : message.channel;

    if (!targetChannel) {
        throw new Error('Channel not found');
    }

    const formattedComponents = components.flatMap(row => {
        if (Array.isArray(row)) {
            return row.map(component =>
                typeof component.toJSON === 'function' ? component.toJSON() : component
            );
        } else if (typeof row.toJSON === 'function') {
            return [row.toJSON()];
        } else if (row.type === 1 && Array.isArray(row.components)) {
            return [row];
        }
        throw new Error('Invalid component format: Components must be serialized.');
    });

    const messageOptions = {
        allowedMentions: { repliedUser: ping, users: ping ? [userId] : [] },
        components: formattedComponents
    };

    if (typeof text === 'string') {
        messageOptions.content = text;
    } else if (typeof text === 'object') {
        if (text.embeds) {
            messageOptions.embeds = text.embeds;
        }
        if (text.content) {
            messageOptions.content = text.content;
        }
    }

    // Add files if provided
    if (Array.isArray(files) && files.length > 0) {
        messageOptions.files = files;
    }

    // Add ephemeral flag if needed
    if (ephemeral) {
        messageOptions.flags = 64;
    }

    let sentMessage;

    if (reply) {
        sentMessage = await message.reply(messageOptions);
    } else {
        sentMessage = await targetChannel.send(messageOptions);
    }

    if (returnId) {
        return sentMessage.id;
    }

    return null;
};