const chalk = require("chalk")

const ANSI_REGEX = /\x1b\[[0-9;]*m/g
function visibleLength(text) {
  return String(text).replace(ANSI_REGEX, "").length
}

const NAME_COLUMN_WIDTH = 42

class CommandLoader {
  constructor(options = {}) {
    this.errors = []
  }

  showLoadingStart(title = "Loading Commands") {
    console.log()
    console.log(chalk.bold.cyan(title))
    console.log(chalk.gray("─".repeat(Math.max(title.length, NAME_COLUMN_WIDTH + 12))))
    console.log()
  }
  
  padToColumn(text, width = NAME_COLUMN_WIDTH) {
    const len = visibleLength(text)
    if (len >= width) {
        const stripped = String(text).replace(ANSI_REGEX, "")
        return stripped.slice(0, Math.max(0, width - 1)) + "…"
    }
    return text + " ".repeat(width - len)
  }

  showLoadingStatus(file, status, errorMessage = null) {
    let statusIcon, statusText, statusColor

    if (status === "success") {
      statusIcon = "✓"
      statusText = "OK"
      statusColor = chalk.green
    } else if (status === "loading") {
      statusIcon = "•"
      statusText = ".."
      statusColor = chalk.yellow
    } else {
      statusIcon = "✗"
      statusText = "ERR"
      statusColor = chalk.red

      if (errorMessage) {
        this.errors.push({ file, error: errorMessage })
      }
    }

    const name = chalk.white(this.padToColumn(file))
    const separator = chalk.gray("│")
    const line = `${name} ${separator} ${statusColor(statusIcon + " " + statusText)}`

    console.log(line)

    if (status === "error" && errorMessage) {
      this.showErrorForCommand(errorMessage)
    }
  }

  showErrorForCommand(errorMessage) {
    const lineMatch = errorMessage.match(/line (\d+)/i)
    const charMatch = errorMessage.match(/(?:char|character|column) (\d+)/i)

    console.log(chalk.red("  ↳ Error: " + errorMessage))

    if (lineMatch || charMatch) {
      let locationInfo = "  ↳ Location: "
      if (lineMatch) locationInfo += `Line ${lineMatch[1]}`
      if (charMatch) locationInfo += `${lineMatch ? ", " : ""}Character ${charMatch[1]}`
      console.log(chalk.yellow(locationInfo))
    }
    console.log()
  }

  showLoadingEnd(failedCommands, totalCommands) {
    console.log()

    if (failedCommands === 0) {
      console.log(chalk.green("✓ All commands loaded successfully!"))
    } else if (failedCommands === totalCommands) {
      console.log(chalk.red("✗ All commands failed to load"))
    } else {
      const successCount = totalCommands - failedCommands
      console.log(chalk.yellow(`⚠ ${failedCommands} failed, ${successCount} loaded`))
    }

    console.log()
  }
}

function showLoadingStart(title) {
  const loader = new CommandLoader()
  loader.showLoadingStart(title)
}

function showLoadingStatus(file, status, errorMessage) {
  const loader = new CommandLoader()
  loader.showLoadingStatus(file, status, errorMessage)
}

function showLoadingEnd(failedCommands, totalCommands) {
  const loader = new CommandLoader()
  loader.showLoadingEnd(failedCommands, totalCommands)
}

module.exports = {
  CommandLoader,
  showLoadingStart,
  showLoadingStatus,
  showLoadingEnd,
}