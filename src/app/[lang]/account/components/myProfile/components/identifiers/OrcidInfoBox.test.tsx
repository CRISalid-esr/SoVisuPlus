import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import OrcidInfoBox from './OrcidInfoBox'

i18n.load('en', {})
i18n.activate('en')

const renderBox = (
  props: Partial<React.ComponentProps<typeof OrcidInfoBox>> = {},
) =>
  render(
    <I18nProvider i18n={i18n}>
      <OrcidInfoBox orcid='0000-0002-1825-0097' forceOpen {...props} />
    </I18nProvider>,
  )

describe('OrcidInfoBox', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })
  afterEach(() => jest.resetAllMocks())

  it('fetches the profile, shows name + affiliations, then calls onReady', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        givenNames: 'Josiah',
        familyName: 'Carberry',
        otherNames: ['J. S. Carberry'],
        affiliations: ['Brown University (Professor)'],
      }),
    })

    renderBox({ onReady })

    expect(await screen.findByText('Josiah Carberry')).toBeInTheDocument()
    expect(screen.getByText('J. S. Carberry')).toBeInTheDocument()
    expect(screen.getByText('Brown University (Professor)')).toBeInTheDocument()
    await waitFor(() => expect(onReady).toHaveBeenCalled())

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('/api/orcid/person/0000-0002-1825-0097')
  })

  it('shows a not-found message and still calls onReady on 404', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 })

    renderBox({ onReady, orcid: '0000-0002-1825-0000' })

    expect(
      await screen.findByText('orcid_info_box_not_found'),
    ).toBeInTheDocument()
    await waitFor(() => expect(onReady).toHaveBeenCalled())
  })

  it('shows an error and does not call onReady on a non-404 failure', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502 })

    renderBox({ onReady })

    expect(await screen.findByText('orcid_info_box_error')).toBeInTheDocument()
    expect(onReady).not.toHaveBeenCalled()
  })
})
