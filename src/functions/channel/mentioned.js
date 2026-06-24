const errors = require("../../errors")

const SOURCE = "cmd.channel.mentioned"

module.exports = function mentionedChannel(message, index) {
    if (!message) errors.missing("message", SOURCE)
    if (!message.mentions) errors.invalidValue("message", "The message object has no mentions.", SOURCE)
    
    if (index !== undefined && (typeof index !== "number" || index < 1)) {
        errors.outOfRange("index", "The index must be a number greater than or equal to 1.", SOURCE, {
            expected: ">= 1",
            received: index,
        })
    }

    const mentions = message.mentions.channels
    
    if (!mentions || mentions.size === 0) return null

    const mentionedChannelsArray = Array.from(mentions.values())

    if (index === undefined) {
        return mentionedChannelsArray.map(ch => ch.id)
    }

    const mentionedChannel = mentionedChannelsArray[index - 1]
    return mentionedChannel ? mentionedChannel.id : null
}