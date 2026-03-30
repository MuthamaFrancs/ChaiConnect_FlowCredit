/** In-memory M-Pesa event log (replace with DB rows in production). */
const MAX = 300
const events = []

function push(entry) {
  const row = {
    id: entry.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: entry.ts || new Date().toISOString(),
    ...entry,
  }
  events.unshift(row)
  while (events.length > MAX) events.pop()
  return row
}

function listRecent(n = 50) {
  return events.slice(0, n)
}

function clear() {
  events.length = 0
}

module.exports = { push, listRecent, clear }
