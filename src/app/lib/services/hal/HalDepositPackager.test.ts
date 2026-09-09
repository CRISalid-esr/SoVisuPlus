import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { DocumentState } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { Journal } from '@/types/Journal'
import { HalDeposit, HalDepositFile } from '@/types/HalDeposit'
import { HalDepositPackager } from './HalDepositPackager'
import { halFilesDir, halTeiDir } from './halUploadsRoot'

let root: string

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'hal-pkg-'))
  process.env.HAL_UPLOADS_ROOT = root
})

afterAll(() => {
  delete process.env.HAL_UPLOADS_ROOT
  fs.rmSync(root, { recursive: true, force: true })
})

const artDocument = () =>
  new DocumentClass(
    'doc-1',
    DocumentType.Article,
    null,
    '2024',
    null,
    null,
    null,
    [new Literal('Title', 'en')],
    [],
    [],
    [],
    [],
    DocumentState.default,
    new Journal('Journal of Tests', '1234-5678', 'Pub', []),
  )

const makeDeposit = (id: number, files: HalDepositFile[]) =>
  new HalDeposit(
    id,
    'doc-1',
    'person-1',
    'pending' as never,
    null,
    null,
    null,
    null,
    null,
    0,
    null,
    null,
    null,
    null,
    'ART',
    ['shs.hisphilso'],
    'en',
    null, // conferenceTitle
    null, // conferenceCity
    null, // conferenceStartDate
    null, // conferenceCountry
    null, // institution
    null, // bookTitle
    null, // supervisor
    files,
    new Date(Date.UTC(2026, 5, 24)),
    new Date(Date.UTC(2026, 5, 24)),
  )

describe('HalDepositPackager', () => {
  const packager = new HalDepositPackager()

  it('writes an XML-only artifact when there are no files (Case 1)', async () => {
    const artifact = await packager.package(makeDeposit(1, []), artDocument())

    expect(artifact.kind).toBe('xml')
    expect(artifact.contentType).toBe('text/xml')
    expect(artifact.filePath).toBe(path.join(halTeiDir(1), 'art.xml'))
    const xml = fs.readFileSync(artifact.filePath, 'utf-8')
    expect(xml).toContain('type="localRef"')
    expect(fs.existsSync(path.join(halTeiDir(1), 'art.zip'))).toBe(false)
  })

  it('builds a flat ZIP with the TEI and attachments when files exist (Case 2)', async () => {
    const filesDir = halFilesDir(2)
    fs.mkdirSync(filesDir, { recursive: true })
    fs.writeFileSync(path.join(filesDir, 'doc.pdf'), 'PDF-DATA')
    fs.writeFileSync(path.join(filesDir, 'data.csv'), 'a,b,c')

    const deposit = makeDeposit(2, [
      new HalDepositFile(
        20,
        'data.csv',
        path.join(filesDir, 'data.csv'),
        false,
        'text/csv',
        'author',
        'annex',
        'now',
        null,
      ),
      new HalDepositFile(
        21,
        'doc.pdf',
        path.join(filesDir, 'doc.pdf'),
        true,
        'application/pdf',
        'author',
        'file',
        'now',
        'cc-by',
      ),
    ])

    const artifact = await packager.package(deposit, artDocument())

    expect(artifact.kind).toBe('zip')
    expect(artifact.contentType).toBe('application/zip')
    expect(artifact.contentDisposition).toBe('attachment; filename=art.xml')

    const entries = new AdmZip(artifact.filePath)
      .getEntries()
      .map((e) => e.entryName)
      .sort()
    expect(entries).toEqual(['art.xml', 'data.csv', 'doc.pdf'])

    // The TEI must reference both files and carry the main file's licence.
    const xml = fs.readFileSync(path.join(halTeiDir(2), 'art.xml'), 'utf-8')
    expect(xml).toContain('target="doc.pdf"')
    expect(xml).toContain('target="data.csv"')
    expect(xml).toContain('licenses/by/4.0')
  })
})
