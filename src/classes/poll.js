const { PollLayoutType } = require("discord.js")
const errors = require("../errors")

const SOURCE = "Poll"

class Poll {
    constructor({ question, answers = [], duration = 24, multiple = false } = {}) {
        if (typeof question !== "string" || !question.trim()) {
            errors.invalidValue("question", 'A poll requires a "question" (non-empty string).', SOURCE, { received: question })
        }

        if (!Array.isArray(answers) || answers.length < 1) {
            errors.invalidValue("answers", 'A poll requires an "answers" array with at least one answer.', SOURCE)
        }

        if (answers.length > 10) {
            errors.outOfRange("answers", "A poll can have at most 10 answers.", SOURCE, {
                expected: "<= 10",
                received: answers.length,
            })
        }

        if (typeof duration !== "number" || duration < 1 || duration > 768) {
            errors.outOfRange("duration", '"duration" must be a number of hours between 1 and 768 (32 days).', SOURCE, {
                expected: "1 - 768",
                received: duration,
            })
        }

        this.poll = {
            question: { text: question.substring(0, 300) },
            duration,
            allowMultiselect: !!multiple,
            layoutType: PollLayoutType.Default,
            answers: answers.map((answer, i) => {
                if (!answer || (typeof answer !== "object" && typeof answer !== "string")) {
                    errors.invalidValue(`answers[${i}]`, `Poll answer #${i + 1} must be a string or an object with "text".`, SOURCE)
                }

                const text = typeof answer === "string" ? answer : answer.text
                if (typeof text !== "string" || !text.trim()) {
                    errors.invalidValue(`answers[${i}].text`, `Poll answer #${i + 1} requires a "text" value.`, SOURCE)
                }

                const out = { text: text.substring(0, 55) }
                if (typeof answer === "object" && answer.emoji) {
                    out.emoji = answer.emoji
                }

                return out
            })
        }
    }

    build() {
        return this.poll
    }
}

module.exports = Poll