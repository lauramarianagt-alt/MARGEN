import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getPublicGallery } from '../../services/galleries.service.js'
import GalleryCarousel from './GalleryCarousel.jsx'
import ResponsiveImage from '../ResponsiveImage.jsx'
export default function PublicGallery({ article }) {
  const id = article.id
  const { t } = useTranslation()
  const [images, setImages] = useState([])
  const [status, setStatus] = useState('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    getPublicGallery(id)
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
  }, [id, retry])
  const cover = article.cover_image_url ? (
    <div className="public-article__cover">
      <ResponsiveImage article={article} alt={article.title} />
    </div>
  ) : null
  if (status === 'loading')
    return (
      cover || (
        <p className="gallery-state" role="status">
          {t('gallery.loading')}
        </p>
      )
    )
  if (status === 'error')
    return (
      <>
        {cover}
        <div className="gallery-state">
          <p>{t('gallery.loadError')}</p>
          <button
            type="button"
            className="navigation-button"
            onClick={() => {
              setStatus('loading')
              setRetry((n) => n + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      </>
    )
  return images.length ? (
    <GalleryCarousel
      key={id}
      images={images}
      title={t('gallery.title')}
      banner
      autoPlay
    />
  ) : (
    cover
  )
}
