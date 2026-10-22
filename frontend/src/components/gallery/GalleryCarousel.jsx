import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ROTATION_DELAY = 6000

function imageVariants(image) {
  return image.thumbnail_url && image.thumbnail_width < image.width
    ? image.thumbnail_url +
        ' ' +
        image.thumbnail_width +
        'w, ' +
        image.image_url +
        ' ' +
        image.width +
        'w'
    : undefined
}

export default function GalleryCarousel({
  images,
  title,
  banner = false,
  autoPlay = false,
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(0)
  const [isPaused, setIsPaused] = useState(
    () =>
      !autoPlay ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  )
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const [isVisible, setIsVisible] = useState(
    document.visibilityState !== 'hidden',
  )
  const [isInView, setIsInView] = useState(true)
  const region = useRef(null)
  const touchStart = useRef(null)
  const index = Math.min(selected, images.length - 1)
  const isRotating =
    autoPlay &&
    images.length > 1 &&
    !isPaused &&
    !isHovered &&
    !hasFocus &&
    isVisible &&
    isInView

  useEffect(() => {
    if (!autoPlay) return
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const onPreferenceChange = (event) => {
      if (event.matches) setIsPaused(true)
    }
    const onVisibilityChange = () =>
      setIsVisible(document.visibilityState !== 'hidden')
    preference?.addEventListener?.('change', onPreferenceChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { threshold: 0.1 },
          )
    if (region.current) observer?.observe(region.current)
    return () => {
      preference?.removeEventListener?.('change', onPreferenceChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      observer?.disconnect()
    }
  }, [autoPlay])

  useEffect(() => {
    if (!isRotating) return
    const timer = window.setTimeout(() => {
      setSelected(
        (current) => (Math.min(current, images.length - 1) + 1) % images.length,
      )
    }, ROTATION_DELAY)
    return () => window.clearTimeout(timer)
  }, [isRotating, index, images.length])

  if (!images.length) return null
  const image = images[index]
  const counter = t('gallery.counter', {
    current: index + 1,
    total: images.length,
  })

  function move(delta) {
    setSelected((current) => {
      const start = Math.min(current, images.length - 1)
      return banner
        ? (start + delta + images.length) % images.length
        : Math.max(0, Math.min(images.length - 1, start + delta))
    })
  }

  function keyDown(event) {
    if (event.target !== event.currentTarget) return
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') setSelected(0)
    else if (event.key === 'End') setSelected(images.length - 1)
    else move(event.key === 'ArrowRight' ? 1 : -1)
  }

  function arrow(direction) {
    return (
      <button
        className="gallery-arrow"
        type="button"
        onClick={() => move(direction)}
        disabled={
          !banner && (direction < 0 ? index === 0 : index === images.length - 1)
        }
        aria-label={t(direction < 0 ? 'gallery.previous' : 'gallery.next')}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d={direction < 0 ? 'M20 12H4m6-6-6 6 6 6' : 'M4 12h16m-6-6 6 6-6 6'}
          />
        </svg>
      </button>
    )
  }

  return (
    <section
      ref={region}
      className={
        'gallery-carousel' + (banner ? ' gallery-carousel--banner' : '')
      }
      role="region"
      aria-roledescription={t('gallery.carousel')}
      aria-label={title || t('gallery.title')}
      tabIndex={0}
      onKeyDown={keyDown}
      onMouseEnter={() => {
        if (window.matchMedia?.('(hover: hover)').matches ?? true)
          setIsHovered(true)
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setHasFocus(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setHasFocus(false)
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0]
        touchStart.current = touch
          ? { x: touch.clientX, y: touch.clientY ?? 0 }
          : null
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]
        const start = touchStart.current
        touchStart.current = null
        if (!start || !end) return
        const deltaX = start.x - end.clientX
        const deltaY = start.y - (end.clientY ?? 0)
        if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY))
          move(deltaX > 0 ? 1 : -1)
      }}
      onTouchCancel={() => {
        touchStart.current = null
      }}
    >
      <header className={banner ? 'sr-only' : 'gallery-carousel__header'}>
        <h2>{title || t('gallery.title')}</h2>
        {!banner && (
          <span aria-live={isRotating ? 'off' : 'polite'} aria-atomic="true">
            {counter}
          </span>
        )}
      </header>
      <figure>
        <div className="gallery-carousel__frame">
          {banner ? (
            <div
              className="gallery-carousel__track"
              style={{ transform: 'translateX(-' + index * 100 + '%)' }}
            >
              {images.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="gallery-carousel__slide"
                  aria-hidden={itemIndex !== index}
                  inert={itemIndex !== index}
                >
                  <img
                    src={item.image_url}
                    srcSet={imageVariants(item)}
                    sizes="(max-width: 1200px) 100vw, 1200px"
                    width={item.width}
                    height={item.height}
                    alt={item.alt_text}
                    loading={itemIndex === index ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <img
              key={image.id}
              src={image.image_url}
              srcSet={imageVariants(image)}
              sizes="(max-width: 700px) 100vw, 1000px"
              width={image.width}
              height={image.height}
              alt={image.alt_text}
              loading="lazy"
            />
          )}
        </div>
        {image.caption && <figcaption>{image.caption}</figcaption>}
      </figure>
      {images.length > 1 &&
        (banner ? (
          <div className="gallery-carousel__controls">
            <span
              className="gallery-carousel__counter"
              aria-live={isRotating ? 'off' : 'polite'}
              aria-atomic="true"
            >
              {counter}
            </span>
            <div
              className="gallery-carousel__navigation"
              role="group"
              aria-label={t('gallery.controls')}
            >
              {arrow(-1)}
              {autoPlay && (
                <button
                  className="gallery-arrow gallery-carousel__rotation"
                  type="button"
                  onClick={() => {
                    setIsPaused((current) => !current)
                    setHasFocus(false)
                  }}
                  aria-label={t(isPaused ? 'gallery.play' : 'gallery.pause')}
                  title={t(isPaused ? 'gallery.play' : 'gallery.pause')}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {isPaused ? (
                      <path d="m8 5 11 7-11 7Z" />
                    ) : (
                      <path d="M9 5v14M15 5v14" />
                    )}
                  </svg>
                </button>
              )}
              {arrow(1)}
            </div>
          </div>
        ) : (
          <div className="gallery-carousel__controls">
            {arrow(-1)}
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
            {arrow(1)}
          </div>
        ))}
    </section>
  )
}
