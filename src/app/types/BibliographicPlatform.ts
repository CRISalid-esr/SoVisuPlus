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
  [BibliographicPlatform.HAL]: { name: 'HAL', icon: '/icons/hal.png' },
  [BibliographicPlatform.SCANR]: { name: 'ScanR', icon: '/icons/scanr.png' },
  [BibliographicPlatform.IDREF]: { name: 'IdRef', icon: '/icons/idref.png' },
  [BibliographicPlatform.OPENALEX]: {
    name: 'OpenAlex',
    icon: '/icons/openalex.png',
  },
  [BibliographicPlatform.SCOPUS]: { name: 'Scopus', icon: '/icons/scopus.png' },
}

export const isValidBibliographicPlatformName = (
  name: string,
): BibliographicPlatform | null => {
  return (
    Object.values(BibliographicPlatform).find(
      (platform) => platform === name,
    ) || null
  )
}

export const getBibliographicPlatformDbValue = (
  platform: BibliographicPlatform,
): keyof typeof DbBibliographicPlatform =>
  platform as keyof typeof DbBibliographicPlatform

export const getBibliographicPlatformFromDbValue = (
  value: keyof typeof DbBibliographicPlatform,
): BibliographicPlatform => value as BibliographicPlatform
