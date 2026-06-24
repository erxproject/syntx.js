// We haven't decided to update this code yet because we want to see how useful it really is after some time. This code might be considered outdated, but it could still work.
const { MessageFlags } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.message.edit"

const V2_COMPONENT_TYPES = new Set([9, 10, 12, 13, 14, 17])

module.exports = async function edit(
  { data: { channel, messageID } = {}, content, embed, embeds = [], components = [], preserveUI = false, options = {} },
  message,
) {
  if (!message?.client) {
    errors.usage("A valid message or interaction context must be passed as the second argument.", SOURCE)
  }

  if (!channel) errors.missing("data.channel", SOURCE)
  if (typeof channel !== "string") errors.invalidType("data.channel", "string", channel, SOURCE)
  if (!messageID) errors.missing("data.messageID", SOURCE)
  if (typeof messageID !== "string") errors.invalidType("data.messageID", "string", messageID, SOURCE)

  const { client } = message

  let targetChannel = channel === message.channelId
    ? message.channel
    : client.channels.cache.get(channel)

  if (!targetChannel) {
    try {
      targetChannel = await client.channels.fetch(channel)
    } catch {
      errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." })
    }
  }

  if (!targetChannel.isTextBased()) {
    errors.invalidValue("data.channel", "The specified channel is not a text-based channel.", SOURCE, { received: targetChannel.type })
  }

  let targetMessage = messageID === message.id
    ? message
    : targetChannel.messages.cache.get(messageID)

  if (!targetMessage) {
    try {
      targetMessage = await targetChannel.messages.fetch(messageID)
    } catch (err) {
      errors.notFound("The message", SOURCE, {
        hint: "Check the message ID is correct.",
        details: err?.message,
      })
    }
  }

  if (targetMessage.author.id !== client.user.id) {
    errors.usage("It is not possible to edit messages whose author is not this bot.", SOURCE, {
      hint: "A bot can only edit its own messages.",
    })
  }

  const embedOptions = embed
    ? {
        title: embed.title,
        url: embed.titleURL || undefined,
        description: embed.description,
        color: embed.color,
        image: embed.image ? { url: embed.image } : undefined,
        thumbnail: embed.thumbnail ? { url: embed.thumbnail } : undefined,
        author: embed.author ? { name: embed.author, icon_url: embed.authorIcon, url: embed.authorURL } : undefined,
        footer: embed.footer ? { text: embed.footer, icon_url: embed.footerIcon } : undefined,
        timestamp: embed.timestamp ? new Date() : undefined,
        fields: Array.isArray(embed.fields)
          ? embed.fields.map((f) => ({
              name: f.name?.toString() || "\u200B",
              value: f.value?.toString() || "\u200B",
              inline: !!f.inline,
            }))
          : undefined,
      }
    : undefined

  const oldComponents = preserveUI ? targetMessage.components.map((c) => (c.toJSON ? c.toJSON() : c)) : []

  const newComponents = components.flatMap((row) => {
    if (Array.isArray(row)) {
      return row.map((component) => (typeof component.toJSON === "function" ? component.toJSON() : component))
    } else if (typeof row?.toJSON === "function") {
      return [row.toJSON()]
    } else if (row && typeof row === "object" && "type" in row) {
      return [row]
    }
    errors.invalidValue("components", "Invalid component format.", SOURCE, {
      hint: "Components must be serialized ActionRows or builders.",
    })
  })

  const finalComponents = preserveUI ? [...oldComponents, ...newComponents] : newComponents

  const usesV2 =
    options.v2 ||
    finalComponents.some((c) => V2_COMPONENT_TYPES.has(c?.type)) ||
    (targetMessage.flags?.has?.(MessageFlags.IsComponentsV2) ?? false)

  if (!usesV2) {
    if (finalComponents.length > 5) {
      errors.outOfRange("components", "Too many component rows. Discord only allows up to 5 action rows.", SOURCE, {
        expected: "<= 5 rows",
        received: finalComponents.length,
      })
    }

    for (const row of finalComponents) {
      if (row.components && row.components.length > 5) {
        errors.outOfRange("components", "Too many components in a row. Discord only allows up to 5 per action row.", SOURCE, {
          expected: "<= 5 per row",
          received: row.components.length,
        })
      }
    }
  }

  const editOptions = { components: finalComponents }

  if (usesV2) {
    editOptions.flags = MessageFlags.IsComponentsV2
    if (content || embed || (Array.isArray(embeds) && embeds.length > 0)) {
      errors.usage("Components V2 messages cannot use content or embeds.", SOURCE, {
        hint: "Use Display components instead of content/embeds.",
      })
    }
  } else {
    editOptions.content = content ?? null
    const allEmbeds = [...(embedOptions ? [embedOptions] : []), ...(Array.isArray(embeds) ? embeds : [])]
    editOptions.embeds = allEmbeds.length > 0 ? allEmbeds : []
  }

  try {
    await targetMessage.edit(editOptions)
  } catch (err) {
    errors.api("edit the message", SOURCE, err)
  }
}