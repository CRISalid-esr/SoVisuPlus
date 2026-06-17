import * as dotenv from 'dotenv'
import process from 'node:process'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { HalTEIInterchangeService } from '@/lib/services/hal/HalTEIInterchangeService'

dotenv.config()

const parseArgs = (
  argv: string[],
): {
  documentUid: string
  domains: string[]
  language?: string
} => {
  let documentUid = ''
  const domains: string[] = []
  let language: string | undefined
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--document-uid':
        documentUid = argv[++i] ?? ''
        break
      case '--domain':
        domains.push(argv[++i] ?? '')
        break
      case '--language':
        language = argv[++i]
        break
    }
  }
  if (!documentUid) throw new Error('--document-uid is required')
  return { documentUid, domains, language }
}

const main = async () => {
  const { documentUid, domains, language } = parseArgs(process.argv.slice(2))

  const dao = new DocumentDAO()
  const document = await dao.fetchDocumentById(documentUid)

  if (!document) {
    console.error(`Document not found: ${documentUid}`)
    process.exit(1)
  }

  if (!document.publicationDate) {
    console.error(
      `Document ${documentUid} has no publicationDate — cannot generate TEI`,
    )
    process.exit(1)
  }

  const service = new HalTEIInterchangeService()
  const tei = service.toHalTEI(document, { domains, language })

  process.stdout.write(tei + '\n')
}

main().catch((err) => {
  console.error('[generate-tei] Failed:', err?.message ?? err)
  process.exit(1)
})
