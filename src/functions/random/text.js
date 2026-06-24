const errors = require("../../errors")

const SOURCE = "cmd.random.text"

function text(texts) {
    if (!Array.isArray(texts)) errors.invalidType("texts", "an array", texts, SOURCE)
    if (texts.length === 0) {
        errors.invalidValue("texts", "The texts array is empty.", SOURCE, { hint: "Provide at least one item to pick from." })
    }

    const result = Math.floor(Math.random() * texts.length)
    return texts[result]
}

module.exports = text