import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFeaturedArticles } from '../services/articles.service.js'
import ResponsiveImage from './ResponsiveImage.jsx'

export default function FeaturedArticlesCarousel() {
  const { t } = useTranslation()
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(0)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const touchStart = useRef(null)

  useEffect(() => {
    let cancelled = false
    getFeaturedArticles()
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setSelected(0)
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [retry])

  const articles = result?.articles ?? []
  const article = articles[selected]
  function move(direction) {
    if (articles.length > 1)
      setSelected(
        (current) => (current + direction + articles.length) % articles.length,
      )
  }
  function handleKeyDown(event) {
    // Leave links/buttons and their keyboard behavior intact.
    if (event.target !== event.currentTarget || articles.length < 2) return
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') setSelected(0)
    else if (event.key === 'End') setSelected(articles.length - 1)
    else move(event.key === 'ArrowRight' ? 1 : -1)
  }

  if (!article)
    return (
      <div className="public-home__opening">
        <div>
          <p className="page-eyebrow">{t('articles.public.eyebrow')}</p>
          <h1
            className="public-home__headline"
            aria-label={t('articles.public.heroTitle')}
          >
            {t('articles.public.heroTitle')
              .split(' ')
              .map((word) => (
                <span key={word}>{word}</span>
              ))}
          </h1>
          <p className="public-home__intro">{t('articles.public.heroIntro')}</p>
          {failed && (
            <button
              className="featured-retry"
              onClick={() => setRetry((value) => value + 1)}
            >
              {t('featured.retry')}
            </button>
          )}
        </div>
        <figure className="public-home__opening-image">
          <img
            src="/images/margen-editorial.webp"
            alt={t('magazine.heroAlt')}
            width="1536"
            height="1024"
            fetchPriority="high"
          />
        </figure>
      </div>
    )

  const href = `/${encodeURIComponent(article.author.username)}/${encodeURIComponent(article.slug)}`
  const daily = result.mode === 'daily-likes'
  return (
    <section
      className="featured-carousel"
      aria-label={t('featured.label')}
      aria-roledescription={t('featured.carousel')}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX
        if (
          touchStart.current !== null &&
          end !== undefined &&
          Math.abs(touchStart.current - end) > 50
        )
          move(touchStart.current > end ? 1 : -1)
        touchStart.current = null
      }}
      onTouchCancel={() => {
        touchStart.current = null
      }}
    >
      <div className="featured-carousel__spread">
        <div className="featured-carousel__copy">
          <p className="page-eyebrow">
            {t(daily ? 'featured.daily' : 'featured.latest')}
          </p>
          <div className="featured-carousel__stories">
            {articles.map((story, index) => {
              const active = index === selected
              const storyHref = `/${encodeURIComponent(story.author.username)}/${encodeURIComponent(story.slug)}`
              return (
                <div
                  key={story.id}
                  className={`featured-carousel__story${active ? '' : ' featured-carousel__story--inactive'}`}
                  role="group"
                  aria-roledescription={t('featured.slide')}
                  aria-hidden={active ? undefined : true}
                  inert={!active}
                  aria-label={t('featured.position', {
                    current: index + 1,
                    total: articles.length,
                  })}
                >
                  <p className="featured-carousel__category">
                    {story.article_categories
                      ?.map(({ category }) =>
                        t(`categories.names.${category.slug}`, {
                          defaultValue: category.name,
                        }),
                      )
                      .join(' · ')}
                  </p>
                  <h1>
                    <Link to={storyHref}>{story.title}</Link>
                  </h1>
                  {story.excerpt && (
                    <p className="featured-carousel__excerpt">
                      {story.excerpt}
                    </p>
                  )}
                  <p className="featured-carousel__byline">
                    {[story.author.name, story.author.surname]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  {daily && story.likes_today > 0 && (
                    <p className="featured-carousel__likes">
                      {t('featured.likes', { count: story.likes_today })}
                    </p>
                  )}
                  <Link className="featured-carousel__read" to={storyHref}>
                    {t('featured.read')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
        <Link
          className="featured-carousel__image"
          to={href}
          aria-label={article.title}
          tabIndex={-1}
        >
          <ResponsiveImage
            article={article}
            alt=""
            fetchPriority="high"
            sizes="(max-width: 700px) 100vw, 60vw"
          />
        </Link>
      </div>
      <div className="featured-carousel__controls">
        <div className="featured-carousel__indicators">
          {articles.length > 1 &&
            articles.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={t('featured.goTo', { title: item.title })}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <span />
              </button>
            ))}
        </div>
        <p
          className="featured-carousel__counter"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">{article.title}. </span>
          {String(selected + 1).padStart(2, '0')} /{' '}
          {String(articles.length).padStart(2, '0')}
        </p>
        {articles.length > 1 && (
          <div className="featured-carousel__arrows">
            <button
              type="button"
              aria-label={t('featured.previous')}
              onClick={() => move(-1)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label={t('featured.next')}
              onClick={() => move(1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
