export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineToHtml(text: string): string {
  let html = escapeHtml(text)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
  return html
}

/** Convert `> …` line groups into `<blockquote>` (Telegram renders it with the accent-colored left bar). */
function blocksToHtml(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let quote: string[] = []
  const flush = (): void => {
    if (quote.length === 0) return
    out.push(`<blockquote>${inlineToHtml(quote.join('\n'))}</blockquote>`)
    quote = []
  }
  for (const line of lines) {
    if (line.startsWith('> ')) quote.push(line.slice(2))
    else if (line === '>') quote.push('')
    else {
      flush()
      out.push(inlineToHtml(line))
    }
  }
  flush()
  return out.join('\n')
}

export function markdownToHtml(text: string): string {
  const parts = text.split(/```[\w-]*/)
  if (parts.length % 2 === 0) return inlineToHtml(text)
  let html = ''
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const code = parts[i]!.replace(/^\n/, '').replace(/\n$/, '')
      html += `<pre>${escapeHtml(code)}</pre>`
    } else {
      html += blocksToHtml(parts[i]!)
    }
  }
  return html
}

export function splitMessage(text: string, maxLength: number): string[] {
  if (maxLength < 1) throw new Error('maxLength must be >= 1')
  if (text.length <= maxLength) return [text]
  const chunks: string[] = []
  let rest = text
  while (rest.length > maxLength) {
    const window = rest.slice(0, maxLength)
    const newline = window.lastIndexOf('\n')
    const ideographic = window.lastIndexOf('。')
    const sentence = window.lastIndexOf('. ')
    const breakAt = Math.max(newline, ideographic, sentence)
    const cut = breakAt > 0 ? (breakAt === sentence ? breakAt + 2 : breakAt + 1) : maxLength
    chunks.push(rest.slice(0, cut))
    rest = rest.slice(cut)
  }
  chunks.push(rest)
  return chunks
}
