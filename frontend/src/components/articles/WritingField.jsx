import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

export default function WritingField({ value, onChange, disabled }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const words = value.trim() ? value.trim().split(/\s+/u).length : 0
  useLayoutEffect(() => {
    const element = input.current
    const resize = () => {
      element.style.height = '0px'
      element.style.height = `${Math.max(288, element.scrollHeight)}px`
    }
    let current = true
    resize()
    document.fonts?.ready.then(() => {
      if (current) resize()
    })
    window.addEventListener('resize', resize)
    return () => {
      current = false
      window.removeEventListener('resize', resize)
    }
  }, [value])
  return (
    <section className="article-editor-field article-writing">
      <div className="article-writing__header">
        <label htmlFor="content">{t('articles.form.fields.content')}</label>
        <span id="writing-count" className="article-writing__count">
          {t('writing.words', { count: words })}
        </span>
      </div>
      <p id="writing-help" className="article-writing__help">
        {t('writing.help')}
      </p>
      <textarea
        ref={input}
        className="article-writing__input"
        id="content"
        name="content"
        maxLength="100000"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={t('writing.placeholder')}
        aria-describedby="writing-help writing-count"
      />
    </section>
  )
}
