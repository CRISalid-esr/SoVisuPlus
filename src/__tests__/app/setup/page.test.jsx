import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SpecialButton from '../../../app/components/SpecialButton'

describe('Page', () => {
  it('renders a heading', () => {
    render(<SpecialButton />)
    const button = screen.getByText('Special Button')
    expect(button).toBeInTheDocument()
  })
})
