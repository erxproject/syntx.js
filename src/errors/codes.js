const ErrorCodes = Object.freeze({
    MISSING_ARGUMENT: "MISSING_ARGUMENT",
    INVALID_TYPE: "INVALID_TYPE",
    INVALID_VALUE: "INVALID_VALUE",
    OUT_OF_RANGE: "OUT_OF_RANGE",
    INVALID_USAGE: "INVALID_USAGE",

    NOT_FOUND: "NOT_FOUND",
    MISSING_PERMISSIONS: "MISSING_PERMISSIONS",

    DISCORD_API_ERROR: "DISCORD_API_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    UNKNOWN: "UNKNOWN",
})

const ErrorCodeLabels = Object.freeze({
    [ErrorCodes.MISSING_ARGUMENT]: "A required argument was not provided",
    [ErrorCodes.INVALID_TYPE]: "An argument has the wrong type",
    [ErrorCodes.INVALID_VALUE]: "An argument has an invalid value",
    [ErrorCodes.OUT_OF_RANGE]: "A value is outside the allowed range",
    [ErrorCodes.INVALID_USAGE]: "A function was used incorrectly",
    [ErrorCodes.NOT_FOUND]: "A Discord resource could not be found",
    [ErrorCodes.MISSING_PERMISSIONS]: "The bot lacks the required permissions",
    [ErrorCodes.DISCORD_API_ERROR]: "The Discord API rejected the request",
    [ErrorCodes.DATABASE_ERROR]: "A database operation failed",
    [ErrorCodes.UNKNOWN]: "An unexpected error occurred",
})

module.exports = { ErrorCodes, ErrorCodeLabels }