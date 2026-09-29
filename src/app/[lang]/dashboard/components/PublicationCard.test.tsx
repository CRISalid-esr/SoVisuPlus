import '@testing-library/jest-dom'
import React from 'react'
import { act, render } from '@testing-library/react'
import { OAStatus } from '@prisma/client'
import PublicationCard from './PublicationCard'

const pushMock = jest.fn()
let currentSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => currentSearchParams,
}))

jest.mock('@lingui/core', () => ({
  i18n: { locale: 'fr', _: (id: string) => id },
}))

jest.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings.join(''),
}))

type ZrHandler = (event: { offsetX: number; offsetY: number }) => void

// Fake chart: the grid ends at x = 300 and each column is 100px wide.
const zrHandlers: Record<string, ZrHandler> = {}
const fakeChart = {
  isDisposed: () => false,
  getZr: () => ({
    on: (name: string, handler: ZrHandler) => {
      zrHandlers[name] = handler
    },
    off: (name: string) => {
      delete zrHandlers[name]
    },
    setCursorStyle: jest.fn(),
  }),
  containPixel: (_finder: string, [x]: number[]) => x < 300,
  convertFromPixel: (finder: { gridIndex?: number }, [x]: number[]) =>
    finder.gridIndex === 0 ? [x / 100, 0] : x / 100,
}

jest.mock('echarts-for-react', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react')
  const ReactEchartsMock = ({
    onChartReady,
  }: {
    onChartReady: (chart: unknown) => void
  }) => {
    useEffect(() => onChartReady(fakeChart), [onChartReady])
    return <div data-testid='chart' />
  }
  return { __esModule: true, default: ReactEchartsMock }
})

const makeDoc = (uid: string) => ({
  uid,
  oaStatus: OAStatus.GREEN,
  publicationDate: null,
  upwOAStatus: null,
  contributions: [],
})

const data = {
  2021: [makeDoc('d1')],
  2022: [makeDoc('d2'), makeDoc('d3')],
  2023: [makeDoc('d4')],
}

const click = (offsetX: number) =>
  act(() => zrHandlers.click({ offsetX, offsetY: 10 }))

describe('PublicationCard', () => {
  beforeEach(() => {
    pushMock.mockClear()
    currentSearchParams = new URLSearchParams()
  })

  it('opens the publications list filtered on the clicked year', () => {
    currentSearchParams = new URLSearchParams(
      'perspective=jdoe&tab=outside_hal&structures=%5B%5D',
    )
    render(
      <PublicationCard yearRange={[2021, 2023]} data={data} loading={false} />,
    )

    click(140)

    expect(pushMock).toHaveBeenCalledTimes(1)
    const [path, query] = pushMock.mock.calls[0][0].split('?')
    expect(path).toBe('/fr/documents')
    const params = new URLSearchParams(query)
    expect(params.get('perspective')).toBe('jdoe')
    expect(params.get('years')).toBe('2022,2022')
    expect(params.get('resetFilters')).toBe('true')
    expect(params.has('tab')).toBe(false)
    expect(params.has('structures')).toBe(false)
  })

  it('maps the column index on the displayed year range', () => {
    render(
      <PublicationCard yearRange={[2022, 2023]} data={data} loading={false} />,
    )

    click(20)

    const query = pushMock.mock.calls[0][0].split('?')[1]
    expect(new URLSearchParams(query).get('years')).toBe('2022,2022')
  })

  it('ignores clicks outside the chart grid', () => {
    render(
      <PublicationCard yearRange={[2021, 2023]} data={data} loading={false} />,
    )

    click(350)

    expect(pushMock).not.toHaveBeenCalled()
  })
})
