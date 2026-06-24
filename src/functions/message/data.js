const errors = require("../../errors")

const SOURCE = "cmd.message.data"

const ComponentType = {
    ActionRow: 1,
    Button: 2,
    StringSelect: 3,
    TextInput: 4,
    UserSelect: 5,
    RoleSelect: 6,
    MentionableSelect: 7,
    ChannelSelect: 8,
    Section: 9,
    TextDisplay: 10,
    Thumbnail: 11,
    MediaGallery: 12,
    File: 13,
    Separator: 14,
    Container: 17,
}

module.exports = async function data({ channel, messageID, type, index = 0, name }, message) {
    if (!channel) errors.missing("channel", SOURCE)
    if (!messageID) errors.missing("messageID", SOURCE)
    if (!type) errors.missing("type", SOURCE, { hint: "Specify which piece of data you want, e.g. 'title' or 'content'." })
    if (!message?.client) errors.missing("message", SOURCE, { hint: "Pass the message/interaction object as the second argument." })

    let targetChannel
    try {
        targetChannel = await message.client.channels.fetch(channel)
    } catch (err) {
        errors.notFound("The channel", SOURCE, {
            hint: "Check the channel ID and that the bot can see it.",
            details: err?.message,
        })
    }
    if (!targetChannel) errors.notFound("The channel", SOURCE)

    let msg
    try {
        msg = await targetChannel.messages.fetch(messageID)
    } catch (err) {
        errors.notFound("The message", SOURCE, {
            hint: "Check the message ID and that it exists in that channel.",
            details: err?.message,
        })
    }
    if (!msg) errors.notFound("The message", SOURCE)

    const embed = msg.embeds[0] ?? null
    const isV2 = msg.flags?.has("IsComponentsV2") ?? false

    try {
        switch (type) {
            case "title":           return embed?.title ?? null
            case "description":     return embed?.description ?? null
            case "image":           return embed?.image?.url ?? null
            case "thumbnail":       return embed?.thumbnail?.url ?? null
            case "footer":          return embed?.footer?.text ?? null
            case "footerIcon":      return embed?.footer?.iconURL ?? null
            case "author":          return embed?.author?.name ?? null
            case "authorIcon":      return embed?.author?.iconURL ?? null
            case "authorURL":       return embed?.author?.url ?? null
            case "titleURL":        return embed?.url ?? null
            case "color":           return embed?.color ?? null
            case "timestamp":       return embed?.timestamp ?? null
            case "embedCount":      return msg.embeds.length
            case "fields":          return embed?.fields ?? []
            case "fieldName":       return embed?.fields[index]?.name ?? null
            case "fieldValue":      return embed?.fields[index]?.value ?? null
            case "fieldInline":     return embed?.fields[index]?.inline ?? null
            case "fieldByName":     return embed?.fields.find(f => f.name === name) ?? null
            case "fieldCount":      return embed?.fields.length ?? 0

            case "content":         return msg.content || null
            case "id":              return msg.id
            case "channelId":       return msg.channelId
            case "guildId":         return msg.guildId ?? null
            case "createdAt":       return msg.createdAt.toISOString()
            case "editedAt":        return msg.editedAt?.toISOString() ?? null
            case "pinned":          return msg.pinned
            case "tts":             return msg.tts
            case "messageType":     return msg.type
            case "flags":           return msg.flags.toArray()

            case "authorId":        return msg.author.id
            case "authorUsername":  return msg.author.username
            case "authorGlobalName": return msg.author.globalName ?? null
            case "authorBot":       return msg.author.bot
            case "authorAvatar":    return msg.author.displayAvatarURL({ size: 1024 })

            case "attachment":      return msg.attachments.map(att => att.url)
            case "attachmentCount": return msg.attachments.size
            case "attachmentData":
                return msg.attachments.map(att => ({
                    id:          att.id,
                    name:        att.name,
                    url:         att.url,
                    proxyURL:    att.proxyURL,
                    size:        att.size,
                    contentType: att.contentType,
                    width:       att.width ?? null,
                    height:      att.height ?? null,
                    spoiler:     att.spoiler,
                }))

            case "mentionedUsers":      return msg.mentions.users.map(u => u.id)
            case "mentionedRoles":      return msg.mentions.roles.map(r => r.id)
            case "mentionedChannels":   return msg.mentions.channels.map(c => c.id)
            case "mentionedEveryone":   return msg.mentions.everyone

            case "reactions":
                return msg.reactions.cache.map(r => ({
                    emoji: r.emoji.id ? `<:${r.emoji.name}:${r.emoji.id}>` : r.emoji.name,
                    count: r.count,
                    me:    r.me,
                }))
            case "reactionCount":   return msg.reactions.cache.size

            case "stickers":
                return msg.stickers.map(s => ({
                    id:   s.id,
                    name: s.name,
                    url:  s.url,
                }))

            case "reference":       return msg.reference ?? null
            case "referenceId":     return msg.reference?.messageId ?? null

            case "isV2":            return isV2
            case "components":      return msg.components
            case "componentCount":  return msg.components.length

            case "buttons":
                return msg.components
                    .flatMap(c => c.components ?? [])
                    .filter(c => c.type === ComponentType.Button)
                    .map(btn => ({
                        label:    btn.label ?? null,
                        customId: btn.customId ?? null,
                        style:    btn.style,
                        emoji:    btn.emoji ?? null,
                        url:      btn.url ?? null,
                        disabled: btn.disabled,
                    }))

            case "selectMenus":
                return msg.components
                    .flatMap(c => c.components ?? [])
                    .filter(c => [
                        ComponentType.StringSelect,
                        ComponentType.UserSelect,
                        ComponentType.RoleSelect,
                        ComponentType.MentionableSelect,
                        ComponentType.ChannelSelect,
                    ].includes(c.type))
                    .map(sel => ({
                        type:        sel.type,
                        customId:    sel.customId,
                        placeholder: sel.placeholder ?? null,
                        minValues:   sel.minValues,
                        maxValues:   sel.maxValues,
                        disabled:    sel.disabled,
                        options:     sel.options ?? [],
                    }))

            case "textDisplays":
                return msg.components
                    .filter(c => c.type === ComponentType.TextDisplay)
                    .map(c => c.content)

            case "textDisplayAt":
                return msg.components
                    .filter(c => c.type === ComponentType.TextDisplay)[index]
                    ?.content ?? null

            case "mediaGallery":
                return msg.components
                    .filter(c => c.type === ComponentType.MediaGallery)
                    .flatMap(c => c.items.map(item => ({
                        url:         item.media?.url ?? null,
                        description: item.description ?? null,
                        spoiler:     item.spoiler ?? false,
                    })))

            case "fileComponents":
                return msg.components
                    .filter(c => c.type === ComponentType.File)
                    .map(c => ({
                        url:     c.file?.url ?? null,
                        spoiler: c.spoiler ?? false,
                    }))

            case "sections":
                return msg.components
                    .filter(c => c.type === ComponentType.Section)
                    .map(sec => ({
                        components: sec.components,
                        accessory:  sec.accessory ?? null,
                    }))

            case "containers":
                return msg.components
                    .filter(c => c.type === ComponentType.Container)
                    .map(con => ({
                        accentColor: con.accentColor ?? null,
                        spoiler:     con.spoiler ?? false,
                        components:  con.components,
                    }))

            case "separators":
                return msg.components
                    .filter(c => c.type === ComponentType.Separator)
                    .map(sep => ({
                        divider: sep.divider ?? true,
                        spacing: sep.spacing ?? null,
                    }))

            case "thumbnailComponents":
                return msg.components
                    .filter(c => c.type === ComponentType.Thumbnail)
                    .map(t => ({
                        url:         t.media?.url ?? null,
                        description: t.description ?? null,
                        spoiler:     t.spoiler ?? false,
                    }))

            default:
                errors.invalidValue("type", `Invalid type specified: "${type}".`, SOURCE, { received: type })
        }
    } catch (err) {
        if (err instanceof errors.SyntxError) throw err
        errors.custom({
            code: errors.ErrorCodes.UNKNOWN,
            source: SOURCE,
            message: "Failed to read the requested message data.",
            cause: err,
        })
    }
}