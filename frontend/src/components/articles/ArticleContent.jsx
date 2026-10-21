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
        <p key={index}>
          {paragraph.content.length ? (
            paragraph.content.map((node, inlineIndex) => {
              if (node.type === 'hardBreak') return <br key={inlineIndex} />
              let text = <SourceLinks text={node.text} />
              for (const mark of node.marks ?? []) {
                if (mark.type === 'bold') text = <strong>{text}</strong>
                if (mark.type === 'italic') text = <em>{text}</em>
                if (mark.type === 'underline') text = <u>{text}</u>
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
