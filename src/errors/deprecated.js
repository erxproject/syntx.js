const chalk = require("chalk")
const logger = require("./logger")

const warned = new Set()

function printDeprecation(name, { replacement, hint, removeIn }) {
    const header = `${chalk.bold.yellow("⚠ [syntx] DEPRECATED")}${name ? chalk.gray(` (${name})`) : ""}`

    console.warn(header)
    console.warn("  " + chalk.white("This function is deprecated and may be removed in a future version."))
    if (removeIn) console.warn("  " + chalk.gray(`Planned removal: ${removeIn}`))
    if (replacement) console.warn("  " + chalk.cyan(`↳ Use "${replacement}" instead.`))
    if (hint) console.warn("  " + chalk.yellow(`↳ Hint: ${hint}`))
}

function deprecated(name, { replacement = null, hint = null, removeIn = null } = {}) {
    if (!name) return
    if (!logger.getConfig().deprecations) return
    if (warned.has(name)) return

    warned.add(name)

    try {
        printDeprecation(name, { replacement, hint, removeIn })
    } catch {}
}

function resetDeprecationWarnings() {
    warned.clear()
}

module.exports = { deprecated, resetDeprecationWarnings }