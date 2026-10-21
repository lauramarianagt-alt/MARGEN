import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Extension } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Plugin } from '@tiptap/pm/state'
import {
  contentToDocument,
  contentToText,
  MAX_ARTICLE_CONTENT,
  serializeContent,
} from '../../lib/article-content.js'

const ContentLimit = Extension.create({
  name: 'contentLimit',
  addOptions: () => ({ onLimit: () => {} }),
  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true
          const size = serializeContent(transaction.doc.toJSON()).length
          const allowed =
            size <= MAX_ARTICLE_CONTENT ||
            size <= serializeContent(state.doc.toJSON()).length
          this.options.onLimit(!allowed)
          return allowed
        },
      }),
    ]
  },
})

export default function WritingField({ value, onChange, disabled }) {
  const { t } = useTranslation()
  const [limitReached, setLimitReached] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        gapcursor: false,
        heading: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true },
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        trailingNode: false,
      }),
      ContentLimit.configure({ onLimit: setLimitReached }),
    ],
    content: contentToDocument(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        id: 'content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': 'writing-label',
        'aria-describedby': 'writing-help writing-count',
        class: 'article-writing__input',
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange({
        target: { name: 'content', value: serializeContent(current.getJSON()) },
      })
    },
  })
  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive('bold') ?? false,
      italic: current?.isActive('italic') ?? false,
      underline: current?.isActive('underline') ?? false,
    }),
  })
  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])
  useEffect(() => {
    if (editor && serializeContent(editor.getJSON()) !== value) {
      const next = contentToDocument(value)
      if (
        JSON.stringify(editor.schema.nodeFromJSON(next).toJSON()) !==
        JSON.stringify(editor.getJSON())
      ) {
        editor.commands.setContent(next, { emitUpdate: false })
      }
    }
  }, [editor, value])
  const text = contentToText(value).trim()
  const words = text ? text.split(/\s+/u).length : 0
  return (
    <section className="article-editor-field article-writing">
      <div className="article-writing__header">
        <label id="writing-label" htmlFor="content">
          {t('articles.form.fields.content')}
        </label>
        <span id="writing-count" className="article-writing__count">
          {t('writing.words', { count: words })}
        </span>
      </div>
      <div
        className="article-writing__tools"
        role="group"
        aria-label={t('writing.formatting')}
      >
        {['bold', 'italic', 'underline'].map((mark) => (
          <button
            key={mark}
            type="button"
            aria-label={t(`writing.${mark}`)}
            title={t(`writing.${mark}`)}
            aria-pressed={marks?.[mark] ?? false}
            disabled={disabled || !editor}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const chain = editor.chain().focus()
              if (mark === 'bold') chain.toggleBold().run()
              if (mark === 'italic') chain.toggleItalic().run()
              if (mark === 'underline') chain.toggleUnderline().run()
            }}
          >
            <span
              className={`article-writing__tool-label article-writing__tool-label--${mark}`}
              aria-hidden="true"
            >
              {t(`writing.${mark}`)}
            </span>
          </button>
        ))}
      </div>
      <p id="writing-help" className="article-writing__help">
        {t('writing.help')}
      </p>
      <div
        className="article-writing__surface"
        data-placeholder={t('writing.placeholder')}
        data-empty={editor?.isEmpty ?? true}
      >
        <EditorContent editor={editor} />
      </div>
      {limitReached && (
        <p className="article-editor-help" role="alert">
          {t('writing.limit')}
        </p>
      )}
    </section>
  )
}
