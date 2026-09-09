import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'
import { Document } from '@/types/Document'
import { HalDeposit, HalDepositFile } from '@/types/HalDeposit'
import {
  HalFileDescriptor,
  HalTEIInterchangeService,
} from '@/lib/services/hal/HalTEIInterchangeService'
import { licenceTargetFor } from '@/lib/services/hal/halLicenses'
import { computeNotBefore } from '@/lib/services/hal/halVisibility'
import { halTeiDir } from '@/lib/services/hal/halUploadsRoot'

const TEI_FILENAME = 'art.xml'
const ZIP_FILENAME = 'art.zip'

export type DepositArtifact = {
  /** `xml` → Case 1 (notice), `zip` → Case 2 (with files). */
  kind: 'xml' | 'zip'
  filePath: string
  contentType: string
  /** Only set for ZIP deposits — names the TEI entry inside the archive. */
  contentDisposition?: string
}

/**
 * Turns a deposit + its files into the on-disk artifacts under `uploads/hal-tei/<id>/` and
 * returns a descriptor the SWORD client submits. Owns all filesystem concerns for deposits.
 */
export class HalDepositPackager {
  constructor(
    private readonly tei: HalTEIInterchangeService = new HalTEIInterchangeService(),
  ) {}

  async package(
    deposit: HalDeposit,
    document: Document,
  ): Promise<DepositArtifact> {
    const files = this.orderFiles(deposit.files)
    const xml = this.tei.toHalTEI(document, this.buildOptions(deposit, files))

    const outDir = halTeiDir(deposit.id)
    await fs.promises.mkdir(outDir, { recursive: true })
    const xmlPath = path.join(outDir, TEI_FILENAME)
    await fs.promises.writeFile(xmlPath, xml, 'utf-8')

    if (files.length === 0) {
      return { kind: 'xml', filePath: xmlPath, contentType: 'text/xml' }
    }

    const zip = new AdmZip()
    zip.addLocalFile(xmlPath) // entry name = art.xml
    for (const file of files) {
      // Flat archive (no directory paths), like `zip -j`. The entry name must equal the
      // `target` referenced in the TEI, which is the original filename.
      zip.addFile(file.fileName, await fs.promises.readFile(file.filePath))
    }
    const zipPath = path.join(outDir, ZIP_FILENAME)
    zip.writeZip(zipPath)

    return {
      kind: 'zip',
      filePath: zipPath,
      contentType: 'application/zip',
      contentDisposition: `attachment; filename=${TEI_FILENAME}`,
    }
  }

  /** Main file first, then complementary files, preserving creation order otherwise. */
  private orderFiles(files: HalDepositFile[]): HalDepositFile[] {
    return [...files].sort((a, b) => Number(b.isMain) - Number(a.isMain))
  }

  private buildOptions(deposit: HalDeposit, files: HalDepositFile[]) {
    const mainLicence = files.find((f) => f.isMain)?.license ?? null
    const fileDescriptors: HalFileDescriptor[] = files.map((f, i) => ({
      fileName: f.fileName,
      fileType: f.fileType,
      fileSource: f.fileSource,
      notBefore: computeNotBefore(deposit.createdAt, f.visibility),
      n: i + 1,
    }))

    return {
      domains: deposit.halDomains,
      language: deposit.language,
      halDocumentType: deposit.halDocumentType,
      localRef: deposit.documentUid,
      licenceTarget: licenceTargetFor(mainLicence),
      files: fileDescriptors.length ? fileDescriptors : undefined,
      conferenceTitle: deposit.conferenceTitle,
      conferenceCity: deposit.conferenceCity,
      conferenceStartDate: deposit.conferenceStartDate,
      conferenceCountry: deposit.conferenceCountry,
      institution: deposit.institution,
      bookTitle: deposit.bookTitle,
      supervisor: deposit.supervisor,
    }
  }
}
