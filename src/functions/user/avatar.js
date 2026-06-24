const errors = require("../../errors")

const SOURCE = "cmd.user.avatar"

module.exports = async function avatar(id, message, options = {}) {
    if (!message) errors.missing("message", SOURCE, { hint: "Pass the message/interaction object as the second argument." })

    let user
    const { format, size } = options

    if (!id) {
        user = message.author
        if (!user) {
            errors.notFound("The message author", SOURCE, {
                hint: "Provide a user ID or call this on a message that has an author.",
            })
        }
    } else {
        try {
            user = await message.client.users.fetch(id)
        } catch (err) {
            errors.notFound(`The user with ID "${id}"`, SOURCE, {
                hint: "Check that the user ID is correct.",
                details: err?.message,
            })
        }
    }

    return user.displayAvatarURL({ extension: format || "png", size: size || 128 })
}