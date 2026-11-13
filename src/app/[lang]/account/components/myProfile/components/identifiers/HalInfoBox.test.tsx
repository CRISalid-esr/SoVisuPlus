import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import HalInfoBox from './HalInfoBox'

i18n.load('en', {})
i18n.activate('en')

const renderBox = (
  props: Partial<React.ComponentProps<typeof HalInfoBox>> = {},
) =>
  render(
    <I18nProvider i18n={i18n}>
      <HalInfoBox value='elise-dupont' kind='idhals' forceOpen {...props} />
    </I18nProvider>,
  )

describe('HalInfoBox', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })
  afterEach(() => jest.resetAllMocks())

  it('fetches the author and shows name + linked identifiers, then calls onReady', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        firstName_s: 'Elise',
        lastName_s: 'Dupont',
        fullName_s: 'Elise Dupont',
        valid_s: 'PREFERRED',
        orcidId_s: ['https://orcid.org/0000-0001-2345-6789'],
      }),
    })

    renderBox({ onReady })

    expect(await screen.findByText('Elise Dupont')).toBeInTheDocument()
    expect(screen.getByText('PREFERRED')).toBeInTheDocument()
    expect(screen.getByText('ORCID: 0000-0001-2345-6789')).toBeInTheDocument()
    await waitFor(() => expect(onReady).toHaveBeenCalled())

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('/api/aurehal/author?value=elise-dupont&kind=idhals')
  })

  it('passes personUid to the preview request', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ fullName_s: 'Elise Dupont' }),
    })

    renderBox({ personUid: 'bob' })

    await screen.findByText('Elise Dupont')
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string
    expect(url).toContain('personUid=bob')
  })

  it('warns and does not call onReady when another person holds the idHAL', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        fullName_s: 'Elise Dupont',
        usedByAnotherPerson: true,
      }),
    })

    renderBox({ onReady, personUid: 'bob' })

    expect(
      await screen.findByText('hal_info_box_used_by_another_person'),
    ).toBeInTheDocument()
    expect(onReady).not.toHaveBeenCalled()
  })

  it('shows a not-found message and still calls onReady on 404', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 })

    renderBox({ onReady, value: 'nobody', kind: 'idhals' })

    expect(
      await screen.findByText('hal_info_box_not_found'),
    ).toBeInTheDocument()
    await waitFor(() => expect(onReady).toHaveBeenCalled())
  })

  it('shows an error but still lets the user save when HAL is unavailable (502)', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 502 })

    renderBox({ onReady })

    expect(await screen.findByText('hal_info_box_error')).toBeInTheDocument()
    expect(onReady).toHaveBeenCalled()
  })

  it('shows a check error and keeps Save disabled on any other failure', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 })

    renderBox({ onReady })

    expect(
      await screen.findByText('hal_info_box_check_error'),
    ).toBeInTheDocument()
    expect(onReady).not.toHaveBeenCalled()
  })

  it('keeps Save disabled when the request fails', async () => {
    const onReady = jest.fn()
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('network'))

    renderBox({ onReady })

    expect(
      await screen.findByText('hal_info_box_check_error'),
    ).toBeInTheDocument()
    expect(onReady).not.toHaveBeenCalled()
  })
})
