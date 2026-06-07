/**
 * Share text via Web Share API or clipboard fallback.
 * Returns 'shared' | 'copied' depending on which path was used.
 */
export async function shareOrCopy(data: { title: string; text: string; url?: string }): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
  }

  const copyText = data.url ? `${data.text}\n${data.url}` : data.text
  await navigator.clipboard.writeText(copyText)
  return 'copied'
}

/**
 * Build the invite share payload for a game.
 */
export function buildInvitePayload(gameName: string, code: string) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `${baseUrl}/play/join?code=${code}`
  return {
    title: gameName,
    text: `Join "${gameName}" — predict the FIFA World Cup 2026!\nCode: ${code}`,
    url,
  }
}

/**
 * Build a plain-text standings snippet for sharing.
 */
export function buildStandingsSnippet(
  gameName: string,
  leaderboard: Array<{
    rank: number
    displayName: string
    totalPoints: number
  }>,
  currentPlayerName?: string,
): { title: string; text: string } {
  const lines: string[] = []
  lines.push(`${gameName} — Leaderboard`)
  lines.push('')

  const medals = ['', '  ', '  ']
  const top3 = leaderboard.slice(0, 3)
  for (let i = 0; i < top3.length; i++) {
    const e = top3[i]
    const medal = medals[i] ?? ''
    lines.push(`${medal}${e.rank}. ${e.displayName} — ${e.totalPoints} pts`)
  }

  // Show current player if outside top 3
  if (currentPlayerName) {
    const current = leaderboard.find((e) => e.displayName === currentPlayerName)
    if (current && current.rank > 3) {
      lines.push(`...`)
      lines.push(`${current.rank}. ${current.displayName} — ${current.totalPoints} pts`)
    }
  }

  lines.push('')
  lines.push('WC2026 Prediction Game')

  return {
    title: `${gameName} — Standings`,
    text: lines.join('\n'),
  }
}
