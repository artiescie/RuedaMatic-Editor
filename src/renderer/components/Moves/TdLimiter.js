const ELLIPSIS_CHARACTER = '\u2026'

function TdLimiter (text, max) {
  if (text.length > max) {
    return text.slice(0, max - 1) + ELLIPSIS_CHARACTER
  }
}

module.exports = TdLimiter
