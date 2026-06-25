import { DOMParser } from '@xmldom/xmldom'
import xpath from 'xpath'

export interface ParsedDepositEntry {
  halId: string | null
  halPassword: string | null
  halVersion: number | null
  halUrl: string | null
}

export interface ParsedStatus {
  status: string | null
  comment: string | null
}

/**
 * Parses HAL's SWORD XML responses into plain objects. No I/O, no domain logic — kept separate
 * from `HalSwordClient` so it can be unit-tested against fixtures. Namespace-agnostic via
 * `local-name()` (HAL responses mix the Atom, sword and hal namespaces).
 */
export class HalSwordResponseParser {
  private static readonly domParser = new DOMParser()

  /** Parse the Atom `<entry>` returned by a successful deposit (HTTP 201/202). */
  static parseDepositEntry(xml: string): ParsedDepositEntry {
    const doc = this.domParser.parseFromString(xml, 'text/xml')

    const halId = this.text(doc, "//*[local-name()='entry']/*[local-name()='id']")
    const halPassword = this.text(
      doc,
      "//*[local-name()='password']",
    )
    const versionText = this.text(doc, "//*[local-name()='version']")
    const halUrl = this.attr(
      doc,
      "//*[local-name()='link' and @rel='alternate']/@href",
    )

    const halVersion =
      versionText && /^\d+$/.test(versionText.trim())
        ? Number(versionText.trim())
        : null

    return { halId, halPassword, halVersion, halUrl }
  }

  /** Parse the `<document>` body returned by the status endpoint (HTTP 200). */
  static parseStatus(xml: string): ParsedStatus {
    const doc = this.domParser.parseFromString(xml, 'text/xml')
    return {
      status: this.text(doc, "//*[local-name()='document']/*[local-name()='status']"),
      comment: this.text(doc, "//*[local-name()='document']/*[local-name()='comment']"),
    }
  }

  private static text(doc: Node, expr: string): string | null {
    const node = xpath.select1(expr, doc) as { textContent?: string } | undefined
    const value = node?.textContent?.trim()
    return value ? value : null
  }

  private static attr(doc: Node, expr: string): string | null {
    const node = xpath.select1(expr, doc) as { value?: string } | undefined
    const value = node?.value?.trim()
    return value ? value : null
  }
}
