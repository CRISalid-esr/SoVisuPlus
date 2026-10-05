// Exports an on-screen SVG element as a standalone SVG or PNG file download.

const SVG_NS = 'http://www.w3.org/2000/svg'

const getSvgSize = (svg: SVGSVGElement): { width: number; height: number } => {
  const [, , vbWidth, vbHeight] = (svg.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number)
  if (vbWidth && vbHeight) return { width: vbWidth, height: vbHeight }
  const width = Number(svg.getAttribute('width'))
  const height = Number(svg.getAttribute('height'))
  if (width && height) return { width, height }
  const rect = svg.getBoundingClientRect()
  return { width: rect.width, height: rect.height }
}

export const serializeSvg = (svg: SVGSVGElement): string => {
  const { width, height } = getSvgSize(svg)
  const clone = svg.cloneNode(true) as SVGSVGElement

  // Drop the temporary elements the wordstream adds while a topic is hovered
  clone
    .querySelectorAll("g[cloned='true'], path[wordstream='true']")
    .forEach((node) => node.remove())

  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  // Texts without explicit fill use currentColor: force black on white
  clone.setAttribute('style', 'color:#000')

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('width', '100%')
  background.setAttribute('height', '100%')
  background.setAttribute('fill', '#fff')
  clone.insertBefore(background, clone.firstChild)

  return new XMLSerializer().serializeToString(clone)
}

export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const downloadSvg = (svg: SVGSVGElement, filename: string): void => {
  const blob = new Blob([serializeSvg(svg)], {
    type: 'image/svg+xml;charset=utf-8',
  })
  triggerDownload(blob, `${filename}.svg`)
}

export const downloadPng = async (
  svg: SVGSVGElement,
  filename: string,
  scale = 2,
): Promise<void> => {
  const { width, height } = getSvgSize(svg)
  const svgBlob = new Blob([serializeSvg(svg)], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const url = URL.createObjectURL(svgBlob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load SVG image'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('PNG encoding failed')),
        'image/png',
      ),
    )
    triggerDownload(pngBlob, `${filename}.png`)
  } finally {
    URL.revokeObjectURL(url)
  }
}
