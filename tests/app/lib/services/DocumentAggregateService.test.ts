import prisma from '@/lib/daos/prisma'
import { DocumentAggregateService } from '@/lib/services/DocumentAggregateService'
import { WordstreamTopic } from '@/types/WordStream'

// Stub ConceptFilterService behavior for the test:
// - matchesRegexPattern behaves normally (regex.test)
// - matchesLabelList returns true only for "Administration" (to simulate exclusion list)
jest.mock('@/lib/services/ConceptFilterService', () => ({
  conceptFilterService: {
    matchesRegexPattern: (s: string, r: RegExp) => r.test(s),
    matchesLabelList: jest.fn(
      async (label: string) => label === 'Administration',
    ),
  },
}))

describe('DocumentAggregateService Integration', () => {
  const service = new DocumentAggregateService()

  beforeEach(async () => {
    await prisma.action.deleteMany()
    await prisma.contribution.deleteMany()
    await prisma.document.updateMany({ data: { journalId: null } })
    await prisma.document.deleteMany()

    await prisma.conceptLabel.deleteMany()
    await prisma.concept.deleteMany()

    await prisma.personIdentifier.deleteMany()
    await prisma.person.deleteMany()
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('computes wordstream slices for a person with concept/coauthor streams, honoring filters and sudden values', async () => {
    // --- People
    const pMain = await prisma.person.create({
      data: {
        uid: 'p-main',
        external: false,
        firstName: 'Alice',
        lastName: 'Main',
        displayName: 'Alice Main',
        normalizedName: 'alice main',
      },
    })
    const pCo1 = await prisma.person.create({
      data: {
        uid: 'p-co1',
        external: false,
        firstName: 'Bob',
        lastName: 'Coauthor',
        displayName: 'Bob Coauthor',
        normalizedName: 'bob coauthor',
      },
    })
    const pCo2 = await prisma.person.create({
      data: {
        uid: 'p-co2',
        external: false,
        firstName: 'Carol',
        lastName: 'Coauthor',
        displayName: 'Carol Coauthor',
        normalizedName: 'carol coauthor',
      },
    })

    // --- Concepts + PREF labels
    const c1 = await prisma.concept.create({
      data: { uid: 'c-ml', uri: 'http://example.com/ml' },
    })
    await prisma.conceptLabel.create({
      data: {
        conceptId: c1.id,
        language: 'en',
        value: 'Machine Learning',
        type: 'PREF',
      },
    })

    const c2 = await prisma.concept.create({
      data: { uid: 'c-dm', uri: 'http://example.com/dm' },
    })
    await prisma.conceptLabel.create({
      data: {
        conceptId: c2.id,
        language: 'en',
        value: 'Data Mining',
        type: 'PREF',
      },
    })

    // Wikidata concept (should be excluded by regex)
    const cWikidata = await prisma.concept.create({
      data: { uid: 'c-wd', uri: 'https://www.wikidata.org/entity/Q123' },
    })
    await prisma.conceptLabel.create({
      data: {
        conceptId: cWikidata.id,
        language: 'en',
        value: 'Wikidata Noise',
        type: 'PREF',
      },
    })

    // Label excluded by ConceptFilterService.matchesLabelList
    const cExcluded = await prisma.concept.create({
      data: { uid: 'c-admin', uri: 'http://example.com/admin' },
    })
    await prisma.conceptLabel.create({
      data: {
        conceptId: cExcluded.id,
        language: 'en',
        value: 'Administration',
        type: 'PREF',
      },
    })

    // --- Documents
    // 2020: ML + Wikidata; coauthors: pCo1
    const d2020 = await prisma.document.create({
      data: {
        uid: 'doc-2020-a',
        documentType: 'JournalArticle',
        publicationDate: '2020',
        publicationDateStart: new Date('2020-05-01'),
        publicationDateEnd: new Date('2020-12-31'),
        subjects: { connect: [{ id: c1.id }, { id: cWikidata.id }] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2020.id,
        personId: pMain.id,
        roles: { set: ['author'] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2020.id,
        personId: pCo1.id,
        roles: { set: ['author'] },
      },
    })

    // 2021: ML + DM; coauthors: pCo1, pCo2
    const d2021a = await prisma.document.create({
      data: {
        uid: 'doc-2021-a',
        documentType: 'JournalArticle',
        publicationDate: '2021',
        publicationDateStart: new Date('2021-03-10'),
        publicationDateEnd: new Date('2021-11-20'),
        subjects: { connect: [{ id: c1.id }, { id: c2.id }] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2021a.id,
        personId: pMain.id,
        roles: { set: ['author'] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2021a.id,
        personId: pCo1.id,
        roles: { set: ['author'] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2021a.id,
        personId: pCo2.id,
        roles: { set: ['author'] },
      },
    })

    // 2021: concept with excluded label ("Administration"); coauthors: none
    const d2021b = await prisma.document.create({
      data: {
        uid: 'doc-2021-b',
        documentType: 'JournalArticle',
        publicationDate: '2021',
        publicationDateStart: new Date('2021-01-01'),
        publicationDateEnd: new Date('2021-01-02'),
        subjects: { connect: [{ id: cExcluded.id }] },
      },
    })
    await prisma.contribution.create({
      data: {
        documentId: d2021b.id,
        personId: pMain.id,
        roles: { set: ['author'] },
      },
    })

    // --- Compute
    const slices = await service.computeWordStreamForAgent(
      'p-main',
      'person',
      'en',
      [WordstreamTopic.Concepts, WordstreamTopic.CoAuthors],
      { fromYear: 2020, toYear: 2021, topNPerTopic: 50 },
    )

    // --- Assertions
    expect(Array.isArray(slices)).toBe(true)
    // Expect two years: 2020 and 2021
    expect(slices.map((s) => s.date)).toEqual(['2020', '2021'])

    const s2020 = slices[0]
    const s2021 = slices[1]

    // 2020: Concepts -> only "Machine Learning" (wikidata excluded)
    const c2020 = s2020.words[WordstreamTopic.Concepts]!
    expect(c2020.map((w) => w.text)).toEqual(['Machine Learning'])
    expect(c2020[0].frequency).toBe(1)
    expect(c2020[0].sudden).toBe(1) // first appearance

    // 2020: Coauthors -> only Bob Coauthor
    const co2020 = s2020.words[WordstreamTopic.CoAuthors]!
    expect(co2020.map((w) => w.text)).toEqual(['Bob Coauthor'])
    expect(co2020[0].frequency).toBe(1)
    expect(co2020[0].sudden).toBe(1)

    // 2021: Concepts -> "Machine Learning" (again) + "Data Mining"; "Administration" excluded
    const c2021 = s2021.words[WordstreamTopic.Concepts]!
    expect(c2021.map((w) => w.text).sort()).toEqual(
      ['Data Mining', 'Machine Learning'].sort(),
    )
    const ml2021 = c2021.find((w) => w.text === 'Machine Learning')!
    const dm2021 = c2021.find((w) => w.text === 'Data Mining')!
    expect(ml2021.frequency).toBe(1)
    expect(ml2021.sudden).toBe(0) // was 1 in 2020, still 1 in 2021 => 1 - 1 = 0
    expect(dm2021.frequency).toBe(1)
    expect(dm2021.sudden).toBe(1) // first appearance in 2021

    // 2021: Coauthors -> Bob Coauthor + Carol Coauthor
    const co2021 = s2021.words[WordstreamTopic.CoAuthors]!
    expect(co2021.map((w) => w.text).sort()).toEqual(
      ['Bob Coauthor', 'Carol Coauthor'].sort(),
    )
    const bob2021 = co2021.find((w) => w.text === 'Bob Coauthor')!
    const carol2021 = co2021.find((w) => w.text === 'Carol Coauthor')!
    expect(bob2021.frequency).toBe(1)
    expect(bob2021.sudden).toBe(0) // present in 2020 already
    expect(carol2021.frequency).toBe(1)
    expect(carol2021.sudden).toBe(1) // first appearance

    // Ensure the main person is not counted as coauthor
    expect(co2020.find((w) => w.text.includes('Alice'))).toBeUndefined()
    expect(co2021.find((w) => w.text.includes('Alice'))).toBeUndefined()
  })
})
