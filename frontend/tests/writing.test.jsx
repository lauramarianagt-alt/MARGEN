// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import WritingField from '../src/components/articles/WritingField.jsx'
import i18n from '../src/i18n/index.js'
function Draft() {
  const [value, setValue] = useState('')
  return (
    <WritingField
      value={value}
      onChange={(event) => setValue(event.target.value)}
      disabled={false}
    />
  )
}
beforeEach(async () => {
  await i18n.changeLanguage('es')
})
afterEach(cleanup)
it('keeps paragraph breaks and updates the word count while writing', () => {
  render(<Draft />)
  const input = screen.getByRole('textbox', { name: 'Contenido' })
  fireEvent.change(input, {
    target: { value: 'Una mirada propia.\n\nOtra perspectiva.' },
  })
  expect(input.value).toBe('Una mirada propia.\n\nOtra perspectiva.')
  expect(screen.getByText('5 palabras')).toBeTruthy()
  expect(input.name).toBe('content')
})
it('preserves existing content and disables writing during submission', () => {
  render(
    <WritingField value="Historia guardada" onChange={() => {}} disabled />,
  )
  const input = screen.getByRole('textbox', { name: 'Contenido' })
  expect(input.value).toBe('Historia guardada')
  expect(input.disabled).toBe(true)
})
