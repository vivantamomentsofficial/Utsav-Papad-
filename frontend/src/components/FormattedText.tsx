export function FormattedText({ text }: { text?: string | null }) {
  if (!text) return null

  const blocks = text.split(/\n\s*\n/)

  return (
    <div className="formatted-text">
      {blocks.map((block, idx) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const isBulletList =
          lines.length > 0 && lines.every((line) => line.startsWith('- ') || line.startsWith('* '))

        if (isBulletList) {
          return (
            <ul key={idx} className="formatted-list">
              {lines.map((line, lIdx) => (
                <li key={lIdx}>{line.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }

        return <p key={idx}>{block}</p>
      })}
    </div>
  )
}
