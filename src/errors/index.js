const SyntxError = require("./SyntxError")
const { ErrorCodes, ErrorCodeLabels } = require("./codes")
const logger = require("./logger")
const { deprecated, resetDeprecationWarnings } = require("./deprecated")

function describeType(value) {
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
}

const throwers = {
    missing(argument, source, { hint = null, expected = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.MISSING_ARGUMENT,
            source,
            message: `The "${argument}" argument is required but was not provided.`,
            expected,
            hint: hint || `Pass a valid "${argument}" value when calling ${source || "this function"}.`,
        })
    },

    invalidType(argument, expected, received, source, { hint = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.INVALID_TYPE,
            source,
            message: `The "${argument}" argument has the wrong type.`,
            expected,
            received: typeof received === "string" ? received : describeType(received),
            hint,
        })
    },

    invalidValue(argument, message, source, { hint = null, expected = null, received = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.INVALID_VALUE,
            source,
            message: message || `The "${argument}" argument has an invalid value.`,
            expected,
            received,
            hint,
        })
    },

    outOfRange(argument, message, source, { hint = null, expected = null, received = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.OUT_OF_RANGE,
            source,
            message: message || `The "${argument}" value is out of the allowed range.`,
            expected,
            received,
            hint,
        })
    },

    notFound(resource, source, { hint = null, details = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.NOT_FOUND,
            source,
            message: `${resource} could not be found.`,
            hint: hint || "Double-check the ID and that the bot can actually see this resource.",
            details,
        })
    },

    permissions(action, source, { hint = null, details = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.MISSING_PERMISSIONS,
            source,
            message: `The bot does not have permission to ${action}.`,
            hint: hint || "Check the bot's role position and channel permission overwrites.",
            details,
        })
    },

    usage(message, source, { hint = null, expected = null, received = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.INVALID_USAGE,
            source,
            message,
            hint,
            expected,
            received,
        })
    },

    api(action, source, cause, { hint = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.DISCORD_API_ERROR,
            source,
            message: `Failed to ${action}.`,
            hint: hint || "This usually means missing permissions, an invalid ID, or a Discord-side error.",
            cause,
            details: cause && cause.code ? { discordCode: cause.code } : null,
        })
    },

    database(action, source, cause, { hint = null } = {}) {
        throw new SyntxError({
            code: ErrorCodes.DATABASE_ERROR,
            source,
            message: `Database operation failed while trying to ${action}.`,
            hint,
            cause,
        })
    },

    custom(options) {
        throw new SyntxError(options)
    },
}

let globalCaptured = false
function captureGlobal() {
    if (globalCaptured) return
    globalCaptured = true
    process.on("unhandledRejection", (reason) => {
        logger.record(reason instanceof Error ? reason : new SyntxError({ message: String(reason), code: ErrorCodes.UNKNOWN, log: false }), {
            type: "unhandledRejection",
        })
    })
    process.on("uncaughtException", (err) => {
        logger.record(err, { type: "uncaughtException" })
    })
}

module.exports = {
    SyntxError,
    ErrorCodes,
    ErrorCodeLabels,
    configure: logger.configure,
    getConfig: logger.getConfig,
    log: logger.record,
    captureGlobal,
    deprecated,
    resetDeprecationWarnings,
    ...throwers,
}