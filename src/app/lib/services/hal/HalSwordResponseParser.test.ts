import { HalSwordResponseParser } from './HalSwordResponseParser'

const DEPOSIT_ENTRY = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:sword="http://purl.org/net/sword/terms/"
       xmlns:hal="http://hal.archives-ouvertes.fr">
  <title>Accepted media deposit to HAL</title>
  <id>hal-03701711</id>
  <hal:password><![CDATA[#secret]]></hal:password>
  <hal:version>1</hal:version>
  <updated>2026-06-10T08:35:26+02:00</updated>
  <sword:treatment>stored in HAL workspace</sword:treatment>
  <link rel="alternate" href="https://hal.halpreprod.archives-ouvertes.fr/hal-xyz"/>
</entry>`

const STATUS_DOC = `<?xml version="1.0" encoding="utf-8"?>
<document id="hal-03701713" version="1" password="?#*****">
  <status>verify</status>
  <comment>Merci d'ajouter un résumé.</comment>
</document>`

const ERROR_DOC = `<?xml version="1.0" encoding="utf-8"?>
<sword:error xmlns:sword="http://purl.org/net/sword/error/" xmlns="http://www.w3.org/2005/Atom" href="http://purl.org/net/sword/error/ErrorBadRequest">
  <title>ERROR</title>
  <summary>Some parameters sent with the request were not understood</summary>
  <sword:treatment>processing failed</sword:treatment>
  <sword:verboseDescription>{"duplicate-entry":"Vincent Lhomme et al."}</sword:verboseDescription>
</sword:error>`

describe('HalSwordResponseParser', () => {
  it('extracts id, password, version and public URL from a deposit entry', () => {
    const parsed = HalSwordResponseParser.parseDepositEntry(DEPOSIT_ENTRY)
    expect(parsed.halId).toBe('hal-03701711')
    expect(parsed.halPassword).toBe('#secret')
    expect(parsed.halVersion).toBe(1)
    expect(parsed.halUrl).toBe(
      'https://hal.halpreprod.archives-ouvertes.fr/hal-xyz',
    )
  })

  it('parses status and comment from the status document', () => {
    const parsed = HalSwordResponseParser.parseStatus(STATUS_DOC)
    expect(parsed.status).toBe('verify')
    expect(parsed.comment).toBe("Merci d'ajouter un résumé.")
  })

  it('returns null comment when empty', () => {
    const parsed = HalSwordResponseParser.parseStatus(
      '<document id="x" version="1"><status>accept</status><comment></comment></document>',
    )
    expect(parsed.status).toBe('accept')
    expect(parsed.comment).toBeNull()
  })

  it('extracts summary and verbose description from a SWORD error', () => {
    const parsed = HalSwordResponseParser.parseError(ERROR_DOC)
    expect(parsed.summary).toBe(
      'Some parameters sent with the request were not understood',
    )
    expect(parsed.verboseDescription).toBe(
      '{"duplicate-entry":"Vincent Lhomme et al."}',
    )
  })

  it('returns null fields when the body is not a SWORD error', () => {
    const parsed = HalSwordResponseParser.parseError('<html><body>502</body></html>')
    expect(parsed.summary).toBeNull()
    expect(parsed.verboseDescription).toBeNull()
  })
})
