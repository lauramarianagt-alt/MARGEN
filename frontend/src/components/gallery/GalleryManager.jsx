import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteGalleryImage,
  getOwnGallery,
  updateGalleryImage,
  uploadGalleryImage,
} from '../../services/galleries.service.js'
function ImageEditor({ image, busy, onSave, onDelete }) {
  const { t } = useTranslation()
  const [altText, setAltText] = useState(image.alt_text)
  const [caption, setCaption] = useState(image.caption)
  const [confirm, setConfirm] = useState(false)
  return (
    <article className="gallery-editor-item">
      <img src={image.thumbnail_url} alt={image.alt_text} loading="lazy" />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSave(image.id, { altText, caption })
        }}
      >
        <label>
          {t('gallery.alt')}
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            required
            maxLength={300}
            disabled={busy}
          />
        </label>
        <label>
          {t('gallery.caption')}
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={300}
            disabled={busy}
          />
        </label>
        <div className="gallery-editor-item__actions">
          <button type="submit" className="navigation-button" disabled={busy}>
            {t('gallery.saveText')}
          </button>
          <button
            type="button"
            className="navigation-button"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            {t('gallery.remove')}
          </button>
        </div>
        {confirm && (
          <div className="gallery-delete-confirm">
            <p>{t('gallery.confirmDelete')}</p>
            <button
              type="button"
              onClick={() => {
                onDelete(image.id)
                setConfirm(false)
              }}
              disabled={busy}
            >
              {t('gallery.confirmRemove')}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={busy}
            >
              {t('gallery.cancel')}
            </button>
          </div>
        )}
      </form>
    </article>
  )
}
export default function GalleryManager({ articleId }) {
  const { t } = useTranslation()
  const [images, setImages] = useState([])
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [file, setFile] = useState(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [retry, setRetry] = useState(0)
  const input = useRef(null)
  useEffect(() => {
    let active = true
    getOwnGallery(articleId)
      .then((data) => {
        if (active) {
          setImages(data.images)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [articleId, retry])
  async function run(action) {
    if (busy) return
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await action()
      setSaved(true)
    } catch (actionError) {
      setError(
        actionError.status === 409
          ? t('gallery.limit')
          : t('gallery.actionError'),
      )
    } finally {
      setBusy(false)
    }
  }
  function upload(event) {
    event.preventDefault()
    if (!file) return
    if (
      file.size > 6 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setError(t('gallery.fileError'))
      return
    }
    run(async () => {
      const data = await uploadGalleryImage({
        articleId,
        file,
        altText,
        caption,
      })
      setImages((current) => [...current, data.image])
      setFile(null)
      setAltText('')
      setCaption('')
      input.current.value = ''
    })
  }
  return (
    <section className="gallery-manager" aria-label={t('gallery.manage')}>
      <header>
        <p className="page-eyebrow">{t('gallery.visualStory')}</p>
        <h2>{t('gallery.manageArticle')}</h2>
        <p>{t('gallery.help')}</p>
      </header>
      {status === 'loading' && <p role="status">{t('gallery.loading')}</p>}
      {status === 'error' && (
        <div>
          <p role="alert">{t('gallery.loadError')}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setRetry((n) => n + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="auth-message auth-message--success" role="status">
          {t('gallery.saved')}
        </p>
      )}
      {status === 'ready' && (
        <>
          {!images.length && <p>{t('gallery.empty')}</p>}
          <div className="gallery-editor-list">
            {images.map((image) => (
              <ImageEditor
                key={image.id}
                image={image}
                busy={busy}
                onSave={(id, values) =>
                  run(async () => {
                    const data = await updateGalleryImage(id, values)
                    setImages((current) =>
                      current.map((item) =>
                        item.id === id ? data.image : item,
                      ),
                    )
                  })
                }
                onDelete={(id) =>
                  run(async () => {
                    await deleteGalleryImage(id)
                    setImages((current) =>
                      current.filter((item) => item.id !== id),
                    )
                  })
                }
              />
            ))}
          </div>
          {images.length < 12 ? (
            <form className="gallery-upload" onSubmit={upload}>
              <label>
                {t('gallery.file')}
                <input
                  ref={input}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  disabled={busy}
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null)
                    setSaved(false)
                    setError('')
                  }}
                />
              </label>
              <label>
                {t('gallery.alt')}
                <input
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  required
                  maxLength={300}
                  disabled={busy}
                />
              </label>
              <p className="article-editor-help">{t('gallery.altHelp')}</p>
              <label>
                {t('gallery.caption')}
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={300}
                  disabled={busy}
                />
              </label>
              <button
                className="article-editor-button article-editor-button--primary"
                type="submit"
                disabled={busy}
              >
                {t(busy ? 'gallery.uploading' : 'gallery.upload')}
              </button>
            </form>
          ) : (
            <p>{t('gallery.limit')}</p>
          )}
        </>
      )}
    </section>
  )
}
