import { OAStatus } from '@prisma/client'
import { i18n } from '@lingui/core'
import { I18nProvider } from '@lingui/react'
import { render, screen, act } from '@testing-library/react'
import OAStatusCellBadge from '@/app/[lang]/documents/components/OAStatusCellBadge'

beforeEach(() => {
  act(() => {
    i18n.activate('en')
  })
})

describe('OAStatusCellBadge Component', () => {
  it('displays the right logo', async () => {
    render(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.CLOSED} />
      </I18nProvider>,
    )
    expect(screen.getByTestId('LockOutlinedIcon')).toBeInTheDocument()
    expect(screen.queryByTestId('LockOpenIcon')).not.toBeInTheDocument()
    const chip = screen.getByText('CLOSED')
    expect(chip).toBeInTheDocument()
    const chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#f23427' })
  })

  it('displays the right open access status color', async () => {
    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.DIAMOND} />
      </I18nProvider>,
    )
    let chip = screen.getByText('DIAMOND')
    expect(chip).toBeInTheDocument()
    let chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#5595d9' })

    rerender(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.GOLD} />
      </I18nProvider>,
    )
    chip = screen.getByText('GOLD')
    expect(chip).toBeInTheDocument()
    chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#f5b01b' })

    rerender(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={'BRONZE'} />
      </I18nProvider>,
    )
    chip = screen.getByText(OAStatus.BRONZE)
    expect(chip).toBeInTheDocument()
    chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#eb8036' })

    rerender(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.GREEN} />
      </I18nProvider>,
    )
    chip = screen.getByText('GREEN')
    expect(chip).toBeInTheDocument()
    chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#2fb028' })

    rerender(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.HYBRID} />
      </I18nProvider>,
    )
    chip = screen.getByText('HYBRID')
    expect(chip).toBeInTheDocument()
    chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#7b28bf' })

    rerender(
      <I18nProvider i18n={i18n}>
        <OAStatusCellBadge type={OAStatus.OTHER} />
      </I18nProvider>,
    )
    chip = screen.getByText('OTHER')
    expect(chip).toBeInTheDocument()
    chiproot = chip.closest('.MuiChip-root')
    expect(chiproot).toHaveStyle({ backgroundColor: '#81888f' })
  })
})
