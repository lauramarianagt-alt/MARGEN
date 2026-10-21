import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function CategoryMenu({ categories, value, onChange }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  const items = useRef([])
  const initialFocus = useRef(0)
  const menuId = useId()
  const triggerId = useId()
  const selected = categories.find((category) => category.slug === value)
  const categoryName = (category) =>
    t(`categories.names.${category.slug}`, { defaultValue: category.name })
  const label = selected ? categoryName(selected) : t('articles.filters.more')

  function show(index) {
    initialFocus.current = index
    setOpen(true)
  }

  function closeAndFocus() {
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }

  useLayoutEffect(() => {
    if (!open) return
    const bounds = trigger.current.getBoundingClientRect()
    const below = Math.max(0, window.innerHeight - bounds.bottom - 8)
    const aboveSpace = Math.max(0, bounds.top - 8)
    const opensAbove = below < menu.current.offsetHeight && aboveSpace > below
    setAbove(opensAbove)
    menu.current.style.maxHeight = `${Math.min(320, window.innerHeight * 0.6, opensAbove ? aboveSpace : below)}px`
    items.current[initialFocus.current]?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    const resize = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', resize)
    }
  }, [open])

  function handleKeys(event) {
    if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      closeAndFocus()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeAndFocus()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const current = items.current.indexOf(document.activeElement)
    const last = categories.length - 1
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : (current +
              (event.key === 'ArrowDown' ? 1 : -1) +
              categories.length) %
            categories.length
    items.current[next]?.focus()
  }

  return (
    <div
      ref={root}
      className={`category-menu${selected ? ' category-menu--active' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        className="category-menu__trigger"
        aria-label={
          selected ? `${t('articles.filters.more')}: ${label}` : label
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) setOpen(false)
          else
            show(
              Math.max(
                0,
                categories.findIndex((category) => category.slug === value),
              ),
            )
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show(event.key === 'ArrowDown' ? 0 : categories.length - 1)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeAndFocus()
          }
        }}
      >
        <span>{label}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d={open ? 'm4 10 4-4 4 4' : 'm4 6 4 4 4-4'} />
        </svg>
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className={`category-menu__panel${above ? ' category-menu__panel--above' : ''}`}
          onKeyDown={handleKeys}
        >
          {categories.map((category, index) => (
            <button
              key={category.id}
              ref={(element) => {
                items.current[index] = element
              }}
              type="button"
              role="menuitemradio"
              aria-checked={value === category.slug}
              tabIndex={-1}
              className="category-menu__option"
              onClick={() => {
                closeAndFocus()
                onChange(category.slug)
              }}
            >
              <span>{categoryName(category)}</span>
              {value === category.slug && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                >
                  <path d="m3 8 3 3 7-7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
