const { MessageFlags } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.message.edit"

const V2_COMPONENT_TYPES = new Set([9, 10, 12, 13, 14, 17])

module.exports = async function edit(
  { data: { channel, messageID } = {}, content, embed, embeds = [], components = [], preserveUI = false, options = {} },
  client,
) {
  if (!channel) errors.missing("data.channel", SOURCE)
  if (typeof channel !== "string") errors.invalidType("data.channel", "string", channel, SOURCE)
  if (!message) errors.missing("data.message", SOURCE)
  if (typeof message !== "string") errors.invalidType("data.message", "string", message, SOURCE)
  if (!client?.bot) errors.missing("client", SOURCE, { hint: "Pass the ERXClient instance as the second argument." })

  const targetChannel = client.bot.channels.cache.get(channel.toString())
  if (!targetChannel) {
    errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." })
  }

  const targetMessage = await targetChannel.messages.fetch(message.toString()).catch(() => null)
  if (!targetMessage) errors.notFound("The message", SOURCE, { hint: "Check the message ID is correct." })

  if (targetMessage.author.id !== client.bot.user.id) {
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
    if (err instanceof errors.SyntxError) throw err
    errors.api("edit the message", SOURCE, err)
  }
}