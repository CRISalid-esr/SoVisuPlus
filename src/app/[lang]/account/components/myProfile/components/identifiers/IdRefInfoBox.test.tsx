import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import IdRefInfoBox from './IdRefInfoBox'
import { IdRefPersonData } from '@/lib/services/IdRefService'

// In Jest, <Trans>key</Trans> from @lingui/react/macro falls back to the message ID
// (the hash lookup against the compiled catalog fails). Tests therefore assert against
// message IDs, not translated strings.
i18n.load('en', {})
i18n.activate('en')

const PERSON_DATA: IdRefPersonData = {
  lastName: 'Dupont',
  firstName: 'Marie',
  description: 'Maître de conférences',
  otherIdentifiers: [{ system: 'ORCID', value: '0000-0001-2345-6789' }],
  recentPublications: ['Publication A', 'Publication B'],
}

const renderComponent = (props: React.ComponentProps<typeof IdRefInfoBox>) =>
  render(
    <I18nProvider i18n={i18n}>
      <IdRefInfoBox {...props} />
    </I18nProvider>,
  )

// Accordion expand target — the summary button contains the title message ID
const clickHeader = () =>
  fireEvent.click(screen.getByText('idref_info_box_title'))

describe('IdRefInfoBox', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders collapsed by default and does not fetch', () => {
    renderComponent({ idrefId: '127220747' })

    expect(screen.getByText('idref_info_box_title')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('triggers a fetch when the accordion is expanded', async () => {
    ;(global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})) // never resolves

    renderComponent({ idrefId: '127220747' })
    clickHeader()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/idref/127220747')
  })

  it('shows person data after a successful fetch', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(PERSON_DATA),
    })

    renderComponent({ idrefId: '127220747' })
    clickHeader()

    await waitFor(() => {
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    })

    expect(screen.getByText('Maître de conférences')).toBeInTheDocument()
    expect(screen.getByText('ORCID: 0000-0001-2345-6789')).toBeInTheDocument()
    expect(screen.getByText('Publication A')).toBeInTheDocument()
    expect(screen.getByText('Publication B')).toBeInTheDocument()
  })

  it('shows the not-found message ID on a 404 response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    renderComponent({ idrefId: '000000000' })
    clickHeader()

    await waitFor(() => {
      expect(screen.getByText('idref_info_box_not_found')).toBeInTheDocument()
    })
  })

  it('shows the error message ID on a non-ok, non-404 response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    })

    renderComponent({ idrefId: '127220747' })
    clickHeader()

    await waitFor(() => {
      expect(screen.getByText('idref_info_box_error')).toBeInTheDocument()
    })
  })

  it('loads immediately when forceOpen is true, without user interaction', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(PERSON_DATA),
    })

    renderComponent({ idrefId: '127220747', forceOpen: true })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    })
  })

  it('calls onReady after a successful load', async () => {
    const onReady = jest.fn()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(PERSON_DATA),
    })

    renderComponent({ idrefId: '127220747', forceOpen: true, onReady })

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onReady even on a 404 response', async () => {
    const onReady = jest.fn()

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    renderComponent({ idrefId: '000000000', forceOpen: true, onReady })

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1)
    })
  })

  it('does not fetch a second time when the same id is already loaded', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(PERSON_DATA),
    })

    renderComponent({ idrefId: '127220747' })

    clickHeader()
    await waitFor(() =>
      expect(screen.getByText('Marie Dupont')).toBeInTheDocument(),
    )

    // collapse and expand again
    clickHeader()
    clickHeader()

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
