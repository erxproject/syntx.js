const errors = require("../../errors")
const SOURCE = "cmd.random.number"

function number(a, b) {
    if (typeof a !== "number") errors.invalidType("a", "number", a, SOURCE)
    if (typeof b !== "number") errors.invalidType("b", "number", b, SOURCE)
    if (a >= b) {
        errors.outOfRange("a", '"a" must be strictly less than "b".', SOURCE, {
            expected: "a < b",
            received: `a=${a}, b=${b}`,
        })
    }

    return Math.floor(Math.random() * (b - a) + a)
}

module.exports = number