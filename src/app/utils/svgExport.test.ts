import { downloadSvg, serializeSvg } from './svgExport'

const SVG_NS = 'http://www.w3.org/2000/svg'

const buildSvg = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 800 400')
  svg.innerHTML = `
    <g class="word"><text fill="red">kept</text></g>
    <g cloned="true" topic="Concepts"><text>clone</text></g>
    <path wordstream="true" topic="Concepts" d="M0 0"></path>
  `
  document.body.appendChild(svg)
  return svg
}

const parse = (markup: string): SVGSVGElement =>
  new DOMParser().parseFromString(markup, 'image/svg+xml')
    .documentElement as unknown as SVGSVGElement

describe('serializeSvg', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('produces a standalone SVG with a white background and black text color', () => {
    const result = parse(serializeSvg(buildSvg()))

    expect(result.getAttribute('xmlns')).toBe(SVG_NS)
    expect(result.getAttribute('width')).toBe('800')
    expect(result.getAttribute('height')).toBe('400')
    expect(result.getAttribute('style')).toBe('color:#000')
    const background = result.firstElementChild
    expect(background?.tagName).toBe('rect')
    expect(background?.getAttribute('fill')).toBe('#fff')
  })

  it('removes the temporary hover elements and keeps the original untouched', () => {
    const svg = buildSvg()
    const result = parse(serializeSvg(svg))

    expect(result.querySelector("g[cloned='true']")).toBeNull()
    expect(result.querySelector("path[wordstream='true']")).toBeNull()
    expect(result.querySelector('g.word text')?.textContent).toBe('kept')
    expect(svg.querySelector("g[cloned='true']")).not.toBeNull()
    expect(svg.querySelector('rect')).toBeNull()
  })
})

describe('downloadSvg', () => {
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:mock')
    URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    jest.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('downloads the serialized SVG with the .svg extension', () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('wordstream.svg')
        expect(this.href).toBe('blob:mock')
      })

    downloadSvg(buildSvg(), 'wordstream')

    expect(click).toHaveBeenCalledTimes(1)
    const blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob
    expect(blob.type).toBe('image/svg+xml;charset=utf-8')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
