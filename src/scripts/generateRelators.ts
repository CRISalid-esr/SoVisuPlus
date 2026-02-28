import fs from 'fs'
import * as path from 'path'

const relatorsFilePath = path.resolve(__dirname, './relators.json')
const locRelatorOutputPath = path.resolve(
  __dirname,
  '../app/types/LocRelator.ts',
)

const relators = JSON.parse(fs.readFileSync(relatorsFilePath, 'utf-8'))

const enumEntries: string[] = []
const uriToEnumMap: string[] = []
const relatorToLabelMapEntries: string[] = []
const labelToEnumMapEntries: string[] = []
const enumToUriMapEntries: string[] = []

type Relator = {
  '@id': string
  '@type': string[]
  'http://www.loc.gov/mads/rdf/v1#authoritativeLabel': { '@value': string }[]
}

relators.forEach((entry: Relator) => {
  const uri = entry['@id']

  // Ensure label exists
  const labelEntry = entry['http://www.loc.gov/mads/rdf/v1#authoritativeLabel']
  if (!labelEntry || labelEntry.length === 0) {
    console.warn(`Skipping entry with missing label: ${uri}`)
    return
  }

  const label = labelEntry[0]['@value']

  // Normalize ENUM key for TypeScript
  const enumKey = label
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_') // Replace non-alphanumeric characters with underscores
    .replace(/^(\d)/, '_$1') // Ensure it doesn't start with a number

  // TypeScript Enum Entry
  enumEntries.push(`  ${enumKey} = "${label}",`)
  uriToEnumMap.push(`    "${uri}": LocRelator.${enumKey}`)
  relatorToLabelMapEntries.push(`    [LocRelator.${enumKey}]: "${label}"`)
  labelToEnumMapEntries.push(`    "${label}": LocRelator.${enumKey}`)
  enumToUriMapEntries.push(`    [LocRelator.${enumKey}]: "${uri}"`)
})

// **1️⃣ Generate TypeScript File (`LocRelator.ts`)**
const tsOutput = `export enum LocRelator {
${enumEntries.join('\n')}
}

export class LocRelatorHelper {
  private static readonly uriToRelatorMap: Record<string, LocRelator> = {
${uriToEnumMap.join(',\n')}
  };

  private static readonly relatorToLabelMap: Record<LocRelator, string> = {
${relatorToLabelMapEntries.join(',\n')}
  };

  private static readonly labelToRelatorMap: Record<string, LocRelator> = {
${labelToEnumMapEntries.join(',\n')}
  };

  private static readonly relatorToUriMap: Record<LocRelator, string> = {
${enumToUriMapEntries.join(',\n')}
  };

  static fromURI(uri: string): LocRelator | null {
    return this.uriToRelatorMap[uri] || null;
  }

  static toLabel(relator: LocRelator): string {
    return this.relatorToLabelMap[relator] || relator;
  }

  static fromLabel(label: string): LocRelator | null {
    return this.labelToRelatorMap[label] || null;
  }

  static toUri(relator: LocRelator): string | null {
    return this.relatorToUriMap[relator] || null;
  }
}
`

fs.writeFileSync(locRelatorOutputPath, tsOutput, 'utf-8')
console.log('✅ LocRelator.ts generated successfully!')
