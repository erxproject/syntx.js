const { MessageFlags } = require("discord.js")
const errors = require("../../errors")

const SOURCE = "cmd.message.send"

const V2_COMPONENT_TYPES = new Set([9, 10, 12, 13, 14, 17])

module.exports = async function send(
  {
    text,
    channel,
    returnId = false,
    components = [],
    files = [],
    ephemeral = false,
    embeds = [],
    poll = null,
    options: { reply = false, followUp = false, update = false, ping = true, v2 = false, silent = false } = {},
  },
  message,
) {
  if (text && typeof text !== "string" && typeof text !== "object") {
    errors.invalidType("text", "a string or an object", text, SOURCE)
  }

  if (channel && typeof channel !== "string") {
    errors.invalidType("channel", "string", channel, SOURCE)
  }

  if (!message) {
    errors.missing("message", SOURCE, { hint: "Pass the message or interaction object as the second argument." })
  }

  const isInteraction = !!message.user
  if (ephemeral && !isInteraction) {
    errors.usage("Ephemeral messages only work in interactions.", SOURCE, {
      hint: "Remove ephemeral or call this from a slash command/interaction.",
    })
  }

  const userId = message.author?.id || message.user?.id
  if (!userId) errors.notFound("The user", SOURCE, { hint: "Could not determine the user from the message object." })

  const targetChannel = channel ? message.client.channels.cache.get(channel.toString()) : message.channel
  if (!targetChannel) {
    errors.notFound("The channel", SOURCE, { hint: "Check the channel ID and that the bot can see it." })
  }

  const isDifferentChannel = channel && targetChannel.id !== message.channel?.id

  const formattedComponents = components.flatMap((row) => {
    if (Array.isArray(row)) {
      return row.map((component) => (typeof component.toJSON === "function" ? component.toJSON() : component))
    } else if (typeof row?.toJSON === "function") {
      return [row.toJSON()]
    } else if (row && typeof row === "object" && "type" in row) {
      return [row]
    }
    errors.invalidValue("components", "Invalid component format.", SOURCE, {
      hint: "Components must be serialized builders or { type } objects.",
    })
  })

  const usesV2 = v2 || formattedComponents.some((c) => V2_COMPONENT_TYPES.has(c?.type))

  if (usesV2) {
    if (typeof text === "string" && text.length > 0) {
      errors.usage('Components V2 messages cannot use "text".', SOURCE, {
        hint: 'Put your text inside a Display "text" block instead.',
      })
    }
    if ((Array.isArray(embeds) && embeds.length > 0) || (typeof text === "object" && text?.embeds)) {
      errors.usage("Components V2 messages cannot use embeds.", SOURCE, {
        hint: "Move the content into Display components.",
      })
    }
    if (poll) {
      errors.usage("Components V2 messages cannot include a poll.", SOURCE)
    }
    if (formattedComponents.length === 0) {
      errors.invalidValue("components", "Components V2 messages require at least one Display component.", SOURCE)
    }
  }

  const messageOptions = {
    allowedMentions: { repliedUser: ping, users: ping ? [userId] : [] },
    components: formattedComponents,
  }

  if (!usesV2) {
    if (typeof text === "string") {
      messageOptions.content = text
    } else if (typeof text === "object" && text !== null) {
      if (text.embeds) messageOptions.embeds = text.embeds
      if (text.content) messageOptions.content = text.content
    }

    if (Array.isArray(embeds) && embeds.length > 0) {
      messageOptions.embeds = [...(messageOptions.embeds || []), ...embeds]
    }

    if (poll) {
      messageOptions.poll = typeof poll.build === "function" ? poll.build() : poll
    }
  }

  if (Array.isArray(files) && files.length > 0) {
    messageOptions.files = files
  }

  let flags = 0
  if (ephemeral) flags |= MessageFlags.Ephemeral
  if (silent) flags |= MessageFlags.SuppressNotifications
  if (usesV2) flags |= MessageFlags.IsComponentsV2
  if (flags !== 0) messageOptions.flags = flags

  let sentMessage

  try {
    if (isInteraction && !isDifferentChannel) {
      if (update && typeof message.update === "function") {
        sentMessage = await message.update(messageOptions)
      } else if (reply && typeof message.reply === "function") {
        sentMessage = await message.reply(messageOptions)
      } else if (followUp && typeof message.followUp === "function") {
        sentMessage = await message.followUp(messageOptions)
      } else if (typeof message.editReply === "function") {
        sentMessage = await message.editReply(messageOptions)
      } else {
        sentMessage = await targetChannel.send(messageOptions)
      }
    } else {
      sentMessage = await targetChannel.send(messageOptions)
    }
  } catch (err) {
    if (err instanceof errors.SyntxError) throw err
    errors.api("send the message", SOURCE, err, {
      hint: "This usually means missing permissions or an invalid payload.",
    })
  }

  if (returnId) {
    if (sentMessage?.id) return sentMessage.id
    if (isInteraction && typeof message.fetchReply === "function") {
      const fetched = await message.fetchReply().catch(() => null)
      return fetched?.id || null
    }
    return null
  }

  return null
}