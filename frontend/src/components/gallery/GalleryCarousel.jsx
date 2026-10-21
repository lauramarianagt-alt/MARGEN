import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
export default function GalleryCarousel({ images, title }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const touchStart = useRef(null)
  if (!images.length) return null
  const index = Math.min(selected, images.length - 1)
  const image = images[index]
  function move(delta) {
    setSelected((current) =>
      Math.max(0, Math.min(images.length - 1, current + delta)),
    )
  }
  function keyDown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setSelected(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setSelected(images.length - 1)
    }
  }
  const variants =
    image.thumbnail_width < image.width
      ? `${image.thumbnail_url} ${image.thumbnail_width}w, ${image.image_url} ${image.width}w`
      : undefined
  return (
    <section
      className="gallery-carousel"
      role="region"
      aria-roledescription={t('gallery.carousel')}
      aria-label={title || t('gallery.title')}
      tabIndex={0}
      onKeyDown={keyDown}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return
        const delta = touchStart.current - event.changedTouches[0].clientX
        if (Math.abs(delta) > 50) move(delta > 0 ? 1 : -1)
        touchStart.current = null
      }}
    >
      <header className="gallery-carousel__header">
        <h2>{title || t('gallery.title')}</h2>
        <span aria-live="polite" aria-atomic="true">
          {t('gallery.counter', { current: index + 1, total: images.length })}
        </span>
      </header>
      <figure>
        <div className="gallery-carousel__frame">
          <img
            key={image.id}
            src={image.image_url}
            srcSet={variants}
            sizes="(max-width: 700px) 100vw, 1000px"
            width={image.width}
            height={image.height}
            alt={image.alt_text}
            loading="lazy"
          />
        </div>
        {image.caption && <figcaption>{image.caption}</figcaption>}
      </figure>
      {images.length > 1 && (
        <div className="gallery-carousel__controls">
          <button
            className="gallery-arrow"
            type="button"
            onClick={() => move(-1)}
            disabled={index === 0}
            aria-label={t('gallery.previous')}
          >
            ←
          </button>
          <div className="gallery-carousel__thumbnails">
            {images.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={t('gallery.goTo', { number: i + 1 })}
                aria-pressed={i === index}
                onClick={() => setSelected(i)}
              >
                <img
                  src={item.thumbnail_url}
                  alt=""
                  loading="lazy"
                  width="80"
                  height="60"
                />
              </button>
            ))}
          </div>
          <button
            className="gallery-arrow"
            type="button"
            onClick={() => move(1)}
            disabled={index === images.length - 1}
            aria-label={t('gallery.next')}
          >
            →
          </button>
        </div>
      )}
    </section>
  )
}
