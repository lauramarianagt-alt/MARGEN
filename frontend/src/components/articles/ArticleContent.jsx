import { readRichContent } from '../../lib/article-content.js'

function SourceLinks({ text }) {
  return text.split(/(https:\/\/[^\s<>]+)/gu).map((part, index) =>
    part.startsWith('https://') ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  )
}

function referenceClass(paragraph) {
  const text = paragraph.content.filter(
    (node) => node.type === 'text' && node.text.trim(),
  )
  if (!text.length) return undefined
  if (text.every((node) => node.marks?.some((mark) => mark.type === 'link')))
    return 'public-article__reference'
  const label = text
    .map((node) => node.text)
    .join('')
    .trim()
    .toLocaleLowerCase()
  if (['fuentes y documentación', 'sources and documentation'].includes(label))
    return 'public-article__reference-heading'
  return undefined
}

export default function ArticleContent({ content }) {
  const doc = readRichContent(content)
  if (!doc)
    return (
      <div className="public-article__content">
        <SourceLinks text={content ?? ''} />
      </div>
    )
  return (
    <div className="public-article__content public-article__content--formatted">
      {doc.content.map((paragraph, index) => (
        <p className={referenceClass(paragraph)} key={index}>
          {paragraph.content.length ? (
            paragraph.content.map((node, inlineIndex) => {
              if (node.type === 'hardBreak') return <br key={inlineIndex} />
              let text = node.marks?.some((mark) => mark.type === 'link') ? (
                node.text
              ) : (
                <SourceLinks text={node.text} />
              )
              for (const mark of node.marks ?? []) {
                if (mark.type === 'bold') text = <strong>{text}</strong>
                if (mark.type === 'italic') text = <em>{text}</em>
                if (mark.type === 'underline') text = <u>{text}</u>
                if (mark.type === 'link')
                  text = (
                    <a
                      href={mark.attrs.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {text}
                    </a>
                  )
              }
              return <span key={inlineIndex}>{text}</span>
            })
          ) : (
            <br />
          )}
        </p>
      ))}
    </div>
  )
}
