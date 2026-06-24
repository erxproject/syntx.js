const logger = require("./logger")
const { ErrorCodes } = require("./codes")

class SyntxError extends Error {
    constructor(options = {}) {
        const {
            code = ErrorCodes.UNKNOWN,
            message = "An unexpected error occurred.",
            source = null,
            hint = null,
            expected = null,
            received = null,
            details = null,
            cause = null,
            log = true,
        } = typeof options === "string" ? { message: options } : options

        super(SyntxError.buildMessage({ code, message, source, hint, expected, received }))

        this.name = "SyntxError"
        this.code = code
        this.source = source
        this.hint = hint
        this.expected = expected
        this.received = received
        this.details = details
        this.shortMessage = message
        this.timestamp = new Date()
        if (cause) this.cause = cause

        if (Error.captureStackTrace) Error.captureStackTrace(this, SyntxError)

        if (log) logger.record(this)
    }

    static buildMessage({ code, message, source, hint, expected, received }) {
        let out = `[syntx · ${code}]`
        if (source) out += ` (${source})`
        out += ` ${message}`
        if (expected != null && received != null) out += ` | expected ${expected}, received ${received}`
        else if (expected != null) out += ` | expected ${expected}`
        if (hint) out += ` → Hint: ${hint}`
        return out
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.shortMessage,
            source: this.source,
            hint: this.hint,
            expected: this.expected,
            received: this.received,
            details: this.details,
            timestamp: this.timestamp,
            cause: this.cause ? this.cause.message || String(this.cause) : null,
        }
    }
}

module.exports = SyntxError