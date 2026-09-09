import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import IdentifierPill from './IdentifierPill'

// ── i18n ──────────────────────────────────────────────────────────────────────
// Lingui macro falls back to the key string when no catalog entry exists,
// so tooltip text assertions use the raw message IDs.

i18n.load('en', {})
i18n.activate('en')

// ── Clipboard mock ─────────────────────────────────────────────────────────────

const mockWriteText = jest.fn().mockResolvedValue(undefined)

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    configurable: true,
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PillProps {
  value?: string
  iconLabel?: string
  iconColor?: string
  subLabel?: string
  href?: string
  expandable?: React.ReactNode
}

const renderPill = (props: PillProps = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <IdentifierPill
        value={props.value ?? '127220747'}
        iconLabel={props.iconLabel ?? 'iD'}
        iconColor={props.iconColor ?? '#007A99'}
        subLabel={props.subLabel}
        href={props.href}
        expandable={props.expandable}
      />
    </I18nProvider>,
  )

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('IdentifierPill', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Value display ──────────────────────────────────────────────────────────

  describe('value display', () => {
    it('renders the value as plain text when no href is provided', () => {
      renderPill({ value: '127220747' })

      const el = screen.getByText('127220747')
      expect(el.tagName).not.toBe('A')
    })

    it('renders the value as a link when href is provided', () => {
      renderPill({ value: '127220747', href: 'https://www.idref.fr/127220747' })

      const link = screen.getByRole('link')
      expect(link).toHaveTextContent('127220747')
      expect(link).toHaveAttribute('href', 'https://www.idref.fr/127220747')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('renders the icon label inside the colored circle', () => {
      renderPill({ iconLabel: 'iD' })
      expect(screen.getByText('iD')).toBeInTheDocument()
    })
  })

  // ── Sub-label ──────────────────────────────────────────────────────────────

  describe('subLabel', () => {
    it('renders the subLabel when provided', () => {
      renderPill({ subLabel: 'idHal_s' })
      expect(screen.getByText('idHal_s')).toBeInTheDocument()
    })

    it('does not render a subLabel when omitted', () => {
      renderPill()
      // Only the value and icon label should be present
      expect(screen.queryByText('idHal_s')).not.toBeInTheDocument()
    })
  })

  // ── Copy button ────────────────────────────────────────────────────────────

  describe('copy button', () => {
    it('calls clipboard.writeText with the value when clicked', async () => {
      renderPill({ value: '127220747' })

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /identifier_pill_copy/i }),
        )
      })

      expect(mockWriteText).toHaveBeenCalledWith('127220747')
    })

    it('shows a check icon (copied state) after clicking copy', async () => {
      renderPill({ value: '127220747' })

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /identifier_pill_copy/i }),
        )
      })

      // After copy the button label switches to "copied"
      expect(
        screen.getByRole('button', { name: /identifier_pill_copied/i }),
      ).toBeInTheDocument()
    })

    it('reverts to the copy icon after the feedback timeout', async () => {
      jest.useFakeTimers()
      renderPill({ value: '127220747' })

      await act(async () => {
        fireEvent.click(
          screen.getByRole('button', { name: /identifier_pill_copy/i }),
        )
      })

      // Immediately after click: "copied" state
      expect(
        screen.getByRole('button', { name: /identifier_pill_copied/i }),
      ).toBeInTheDocument()

      // Advance past the 1500 ms reset timeout
      act(() => {
        jest.advanceTimersByTime(1600)
      })

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /identifier_pill_copy/i }),
        ).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  // ── Expandable content ─────────────────────────────────────────────────────

  describe('expandable content', () => {
    const expandable = <div data-testid='expandable-content'>Details</div>

    it('renders a toggle button when expandable is provided', () => {
      renderPill({ expandable })
      expect(
        screen.getByRole('button', { name: /identifier_pill_expand/i }),
      ).toBeInTheDocument()
    })

    it('does not render expandable content before the toggle is clicked', () => {
      renderPill({ expandable })
      expect(screen.queryByTestId('expandable-content')).not.toBeInTheDocument()
    })

    it('shows expandable content after clicking the toggle', () => {
      renderPill({ expandable })
      fireEvent.click(
        screen.getByRole('button', { name: /identifier_pill_expand/i }),
      )
      expect(screen.getByTestId('expandable-content')).toBeInTheDocument()
    })

    it('hides expandable content after clicking the toggle a second time', () => {
      renderPill({ expandable })

      fireEvent.click(
        screen.getByRole('button', { name: /identifier_pill_expand/i }),
      )
      expect(screen.getByTestId('expandable-content')).toBeInTheDocument()

      fireEvent.click(
        screen.getByRole('button', { name: /identifier_pill_collapse/i }),
      )
      expect(screen.queryByTestId('expandable-content')).not.toBeInTheDocument()
    })

    it('does not render a toggle button when no expandable is provided', () => {
      renderPill()
      expect(
        screen.queryByRole('button', { name: /identifier_pill_expand/i }),
      ).not.toBeInTheDocument()
    })
  })
})
