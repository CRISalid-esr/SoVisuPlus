import { BibliographicPlatform as DbBibliographicPlatform } from '@prisma/client'

export enum BibliographicPlatform {
  HAL = 'hal',
  SCANR = 'scanr',
  IDREF = 'idref',
  OPENALEX = 'openalex',
  SCOPUS = 'scopus',
}

export const BibliographicPlatformMetadata: Record<
  BibliographicPlatform,
  { name: string; icon: string }
> = {
  [BibliographicPlatform.HAL]: { name: 'Hal', icon: '/icons/hal.png' },
  [BibliographicPlatform.SCANR]: { name: 'ScanR', icon: '/icons/scanr.png' },
  [BibliographicPlatform.IDREF]: { name: 'IdRef', icon: '/icons/idref.png' },
  [BibliographicPlatform.OPENALEX]: {
    name: 'OpenAlex',
    icon: '/icons/openalex.png',
  },
  [BibliographicPlatform.SCOPUS]: { name: 'Scopus', icon: '/icons/scopus.png' },
}

export function getBibliographicPlatformByNameIgnoreCase(
  name: string,
): BibliographicPlatform | null {
  const lowerName = name.toLowerCase()
  return (
    Object.values(BibliographicPlatform).find(
      (platform) => platform.toLowerCase() === lowerName,
    ) || null
  )
}

export function getBibliographicPlatformDbValue(
  platform: BibliographicPlatform,
): keyof typeof DbBibliographicPlatform {
  return platform as keyof typeof DbBibliographicPlatform
}
