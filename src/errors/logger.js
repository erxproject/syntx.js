const fs = require("fs")
const path = require("path")
const chalk = require("chalk")

const config = {
    enabled: true,
    console: true,
    file: true,
    filePath: path.join(process.cwd(), "logs", "syntx-errors.log"),
    includeStack: true,
    maxFileSize: 5 * 1024 * 1024,
    deprecations: true,
}

function configure(options = {}) {
    if (options && typeof options === "object") Object.assign(config, options)
    return { ...config }
}

function getConfig() {
    return { ...config }
}

function timestamp() {
    return new Date().toISOString()
}

function formatForFile(error, extra) {
    const lines = []
    lines.push("─".repeat(70))
    lines.push(`[${error.timestamp ? error.timestamp.toISOString() : timestamp()}]  ${error.name || "Error"} · ${error.code || "UNKNOWN"}`)
    if (error.source) lines.push(`Source  : ${error.source}`)
    lines.push(`Message : ${error.shortMessage || error.message || "(no message)"}`)
    if (error.expected != null) lines.push(`Expected: ${error.expected}`)
    if (error.received != null) lines.push(`Received: ${error.received}`)
    if (error.hint) lines.push(`Hint    : ${error.hint}`)
    if (error.details) {
        try {
            lines.push(`Details : ${typeof error.details === "string" ? error.details : JSON.stringify(error.details)}`)
        } catch {
            lines.push(`Details : [unserializable]`)
        }
    }
    if (extra && Object.keys(extra).length) {
        try {
            lines.push(`Context : ${JSON.stringify(extra)}`)
        } catch {
            // ignore
        }
    }
    const cause = error.cause
    if (cause && (cause.message || cause.stack)) {
        lines.push(`Caused by: ${cause.message || cause}`)
    }
    if (config.includeStack && error.stack) {
        lines.push("Stack   :")
        lines.push(
            error.stack
                .split("\n")
                .slice(1)
                .map((l) => "    " + l.trim())
                .join("\n"),
        )
    }
    lines.push("")
    return lines.join("\n")
}

function printToConsole(error) {
    const header = `✗ [syntx] ${error.code || "ERROR"}${error.source ? chalk.gray(` (${error.source})`) : ""}`
    console.error(chalk.bold.red(header))
    console.error("  " + chalk.white(error.shortMessage || error.message || ""))
    if (error.expected != null) console.error("  " + chalk.gray(`Expected: ${error.expected}`))
    if (error.received != null) console.error("  " + chalk.gray(`Received: ${error.received}`))
    if (error.hint) console.error("  " + chalk.yellow(`↳ Hint: ${error.hint}`))
    if (error.cause && error.cause.message) console.error("  " + chalk.gray(`↳ Caused by: ${error.cause.message}`))
}

function rotateIfNeeded() {
    try {
        if (!fs.existsSync(config.filePath)) return
        const { size } = fs.statSync(config.filePath)
        if (size > config.maxFileSize) {
            fs.renameSync(config.filePath, config.filePath + ".old")
        }
    } catch {
    }
        // b
}

function writeToFile(error, extra) {
    try {
        const dir = path.dirname(config.filePath)
        if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        rotateIfNeeded()
        fs.appendFileSync(config.filePath, formatForFile(error, extra), "utf8")
    } catch {
        // c
    }
}

function record(error, extra = {}) {
    if (!config.enabled || !error) return error

    if (!error.timestamp) error.timestamp = new Date()
    if (!error.code) error.code = "UNKNOWN"
    if (!error.shortMessage) error.shortMessage = error.message

    if (config.console) {
        try {
            printToConsole(error)
        } catch {
            // ignore
        }
    }
    if (config.file) writeToFile(error, extra)

    return error
}

module.exports = { record, configure, getConfig, _config: config }