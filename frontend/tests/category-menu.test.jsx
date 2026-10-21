// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import CategoryMenu from '../src/components/CategoryMenu.jsx'
import i18n from '../src/i18n/index.js'
const categories = [
  { id: 'cosmetics', slug: 'cosmetics', name: 'Cosmetics' },
  { id: 'photography', slug: 'photography', name: 'Photography' },
  { id: 'runway', slug: 'runway', name: 'Runway' },
]
const change = vi.fn()
function show(value = '') {
  return render(
    <>
      <CategoryMenu categories={categories} value={value} onChange={change} />
      <button>Outside</button>
    </>,
  )
}
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('es')
})
afterEach(cleanup)
describe('Editorial category menu', () => {
  it('opens with the current category checked, then selects and closes', () => {
    show('photography')
    const trigger = screen.getByRole('button', {
      name: 'Más categorías: Fotografía',
    })
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Fotografía' }),
    )
    expect(
      screen
        .getByRole('menuitemradio', { name: 'Fotografía' })
        .getAttribute('aria-checked'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Cosmética' }))
    expect(change).toHaveBeenCalledWith('cosmetics')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
  it('supports arrows, Home, End and Escape without changing the category', () => {
    show()
    const trigger = screen.getByRole('button', { name: 'Más categorías' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Cosmética' }),
    )
    fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Pasarela' }),
    )
    fireEvent.keyDown(document.activeElement, { key: 'Home' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Cosmética' }),
    )
    fireEvent.keyDown(document.activeElement, { key: 'End' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Pasarela' }),
    )
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(change).not.toHaveBeenCalled()
  })
  it('opens from ArrowUp at the last item and returns focus with Shift Tab', () => {
    show()
    const trigger = screen.getByRole('button', { name: 'Más categorías' })
    fireEvent.keyDown(trigger, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(
      screen.getByRole('menuitemradio', { name: 'Pasarela' }),
    )
    fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
  it('closes on outside pointer interaction or when focus leaves', () => {
    show()
    const trigger = screen.getByRole('button', { name: 'Más categorías' })
    fireEvent.click(trigger)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(trigger)
    act(() => screen.getByRole('button', { name: 'Outside' }).focus())
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('toggles closed from the trigger without selecting anything', () => {
    show()
    const trigger = screen.getByRole('button', { name: 'Más categorías' })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(change).not.toHaveBeenCalled()
  })
  it('uses translated labels in English', async () => {
    await i18n.changeLanguage('en')
    show('cosmetics')
    fireEvent.click(
      screen.getByRole('button', { name: 'More categories: Cosmetics' }),
    )
    expect(
      screen.getByRole('menuitemradio', { name: 'Photography' }),
    ).toBeTruthy()
  })
})
