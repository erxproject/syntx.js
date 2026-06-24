const { PermissionsBitField, ChannelType, OverwriteType } = require("discord.js");
const errors = require("../../errors");

const SOURCE = "cmd.channel.edit";

function toCamelCase(str) {
    return str
        .toLowerCase()
        .replace(/_([a-z])/g, (_, l) => l.toUpperCase())
        .replace(/^([a-z])/, (_, l) => l.toUpperCase());
}

async function editChannel({ channel, data = {}, permissions = [] }, message) {
    if (!message?.guild) {
        errors.usage("This function can only be used inside a guild.", SOURCE, {
            hint: "Pass a guild message/interaction as the second argument.",
        });
    }
    if (!channel) errors.missing("channel", SOURCE, { hint: "Provide a channel ID or channel object to edit." });

    const ch = typeof channel === "string" ? message.guild.channels.cache.get(channel) : channel;
    if (!ch) {
        errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." });
    }

    const type = ch.type;
    
    if ("userLimit" in data && type !== ChannelType.GuildVoice) {
        errors.invalidValue("data.userLimit", '"userLimit" can only be used with voice channels.', SOURCE, { received: type });
    }
    if ("bitrate" in data && type !== ChannelType.GuildVoice && type !== ChannelType.GuildStageVoice) {
        errors.invalidValue("data.bitrate", '"bitrate" can only be used with voice or stage channels.', SOURCE, { received: type });
    }
    if ("rtcRegion" in data && type !== ChannelType.GuildVoice && type !== ChannelType.GuildStageVoice) {
        errors.invalidValue("data.rtcRegion", '"rtcRegion" can only be used with voice or stage channels.', SOURCE, { received: type });
    }
    if (
        "cooldown" in data && 
        type !== ChannelType.GuildText && 
        type !== ChannelType.GuildAnnouncement &&
        type !== ChannelType.GuildForum && 
        type !== ChannelType.GuildVoice && 
        type !== ChannelType.GuildStageVoice
    ) {
        errors.invalidValue("data.cooldown", '"cooldown" can only be used with text, announcement, forum, voice, or stage channels.', SOURCE, { received: type });
    }
    if ("availableTags" in data && type !== ChannelType.GuildForum) {
        errors.invalidValue("data.availableTags", '"availableTags" can only be used with forum channels.', SOURCE, { received: type });
    }
    
    const payload = {};

    if ("name" in data) payload.name = data.name;
    if ("topic" in data) payload.topic = data.topic;
    if ("nsfw" in data) payload.nsfw = data.nsfw;
    if ("cooldown" in data) payload.rateLimitPerUser = data.cooldown;
    if ("category" in data) payload.parent = data.category;
    if ("position" in data) payload.position = data.position;
    if ("rtcRegion" in data) payload.rtcRegion = data.rtcRegion;
    if ("bitrate" in data) payload.bitrate = data.bitrate;
    if ("userLimit" in data) payload.userLimit = data.userLimit;
    if ("autoArchiveDuration" in data) payload.defaultAutoArchiveDuration = data.autoArchiveDuration;
    if ("availableTags" in data) payload.availableTags = data.availableTags;
    if ("reason" in data) payload.reason = data.reason;
    
    if (permissions.length) {
        const currentOverwrites = ch.permissionOverwrites.cache.map(po => ({
            id: po.id,
            type: po.type,
            allow: po.allow.bitfield, 
            deny: po.deny.bitfield    
        }));

        for (const perm of permissions) {
            if (!perm.id || !perm.type || typeof perm.permissions !== "object") continue;

            const targetId = perm.id === "everyone" ? message.guild.id : perm.id;
            const targetType = perm.type === "user" ? OverwriteType.Member : OverwriteType.Role;

            let existing = currentOverwrites.find(
                o => o.id === targetId && o.type === targetType
            );

            if (!existing) {
                existing = {
                    id: targetId,
                    type: targetType,
                    allow: 0n,
                    deny: 0n
                };
                currentOverwrites.push(existing);
            }

            for (const [permName, value] of Object.entries(perm.permissions)) {
                const key = toCamelCase(permName);
                const bit = PermissionsBitField.Flags[key];
                if (!bit) {
                    errors.invalidValue("permissions", `Invalid permission name: "${permName}".`, SOURCE, { received: permName });
                }

                if (value === true) {
                    existing.allow |= bit;
                    existing.deny &= ~bit;
                } else if (value === false) {
                    existing.deny |= bit;
                    existing.allow &= ~bit;
                } else {
                    existing.allow &= ~bit;
                    existing.deny &= ~bit;
                }
            }
        }

        payload.permissionOverwrites = currentOverwrites.map(o => ({
            id: o.id,
            type: o.type,
            allow: new PermissionsBitField(o.allow),
            deny: new PermissionsBitField(o.deny)
        }));
    }

    try {
        await ch.edit(payload);
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err;
        errors.api("edit the channel", SOURCE, err, {
            hint: "The bot needs the Manage Channels permission for this channel.",
        });
    }

    return ch;
}

module.exports = editChannel;