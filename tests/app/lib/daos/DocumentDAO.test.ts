import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Document } from '@/types/Document'
import { Person } from '@/types/Person'
import prisma from '@/lib/daos/prisma'
import { Literal } from '@/types/Literal'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { Contribution } from '@/types/Contribution'
import { Concept } from '@/types/Concept'
import { DocumentRecord } from '@/types/DocumentRecord'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { SourceJournal } from '@/types/SourceJournal'
import { OAStatus } from '@prisma/client'
import { PublicationIdentifier } from '@/types/PublicationIdentifier'

describe('DocumentDAO Integration Tests', () => {
  let documentDAO: DocumentDAO
  let personDAO: PersonDAO

  beforeAll(() => {
    documentDAO = new DocumentDAO()
    personDAO = new PersonDAO()
  })

  afterEach(async () => {
    await prisma.contribution.deleteMany()
    await prisma.document.deleteMany()
    await prisma.person.deleteMany()
  })

  test('should remove contributions', async () => {
    // Step 1: Create persons
    const person1 = await personDAO.createOrUpdatePerson(
      new Person('local-p1', false, null, 'Alice', 'Smith', 'Alice Smith', []),
    )
    const person2 = await personDAO.createOrUpdatePerson(
      new Person('local-p2', false, null, 'Bob', 'Johnson', 'Bob Johnson', []),
    )

    // Step 2: Create a document with both contributors
    const documentData = new Document(
      'doc-1',
      Document.documentTypeFromString('JournalArticle'),
      OAStatus.GREEN,
      '2023-01-01',
      new Date('2023-01-01T00:00:00.000Z'),
      new Date('2023-01-01T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Test Document', 'en')],
      [], // No abstracts
      [], // No subjects
      [
        new Contribution(Person.fromDbPerson(person1), [
          LocRelatorHelper.fromLabel('author') as LocRelator,
        ]),
        new Contribution(Person.fromDbPerson(person2), [
          LocRelatorHelper.fromLabel('editor') as LocRelator,
        ]),
      ],
      [],
    )

    const createdDocument =
      await documentDAO.createOrUpdateDocument(documentData)

    // Verify both contributions exist
    let contributions = await prisma.contribution.findMany({
      where: { documentId: createdDocument.id },
    })

    expect(contributions).toHaveLength(2)

    // Step 3: Update the document with only one contributor (removing person2)
    const updatedDocumentData = new Document(
      'doc-1',
      Document.documentTypeFromString('JournalArticle'),
      OAStatus.GREEN,
      '2023-01-01',
      new Date('2023-01-01T00:00:00.000Z'),
      new Date('2023-01-01T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Test Document', 'en')],
      [], // No abstracts
      [], // No subjects
      [new Contribution(Person.fromDbPerson(person1), [])],
      [],
    )

    await documentDAO.createOrUpdateDocument(updatedDocumentData)

    // Verify that only person1 remains and person2's contribution was removed
    contributions = await prisma.contribution.findMany({
      where: { documentId: createdDocument.id },
    })

    expect(contributions).toHaveLength(1)
    expect(contributions[0].personId).toBe(person1.id)
  })

  test('should handle document subjects', async () => {
    // Step 1: Create a subject concept
    const subject1 = new Concept(
      'concept-1',
      [new Literal('Pref Label', 'en')],
      [new Literal('Alt Label', 'en')],
      'http://example.com/concept-1',
    )

    // Step 2: Create a document with a subject
    const documentData = new Document(
      'doc-2',
      Document.documentTypeFromString('JournalArticle'),
      OAStatus.GREEN,
      '2023-02-01',
      new Date('2023-02-01T00:00:00.000Z'),
      new Date('2023-02-01T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Subject Test Document', 'en')],
      [], // No abstracts
      [subject1], // subjects
      [], // No contributions
      [], // No records
    )

    const createdDocument =
      await documentDAO.createOrUpdateDocument(documentData)

    // Verify that the concept exists in the database
    const dbConcept = await prisma.concept.findUnique({
      where: { uid: subject1.uid },
    })
    expect(dbConcept).toBeDefined()

    // Verify that the document is linked to the subject
    const dbDocument = await prisma.document.findUnique({
      where: { uid: createdDocument.uid },
      include: { subjects: true },
    })
    expect(dbDocument).toBeDefined()
    expect(dbDocument?.subjects).toHaveLength(1)
    expect(dbDocument?.subjects[0].uid).toBe(subject1.uid)

    // Step 3: Update the document by adding a second subject
    const subject2 = new Concept(
      'concept-2',
      [new Literal('Pref Label 2', 'en')],
      [new Literal('Alt Label 2', 'en')],
      'http://example.com/concept-2',
    )

    const updatedDocumentData = new Document(
      'doc-2',
      Document.documentTypeFromString('JournalArticle'),
      OAStatus.GREEN,
      '2023-02-01',
      new Date('2023-02-01T00:00:00.000Z'),
      new Date('2023-02-01T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Subject Test Document', 'en')],
      [], // No abstracts
      [subject1, subject2], // both subjects
      [], // No contributions
      [],
    )

    await documentDAO.createOrUpdateDocument(updatedDocumentData)

    // Verify that the second subject exists and is linked correctly
    const dbConcept2 = await prisma.concept.findUnique({
      where: { uid: subject2.uid },
    })
    expect(dbConcept2).toBeDefined()

    const updatedDbDocument = await prisma.document.findUnique({
      where: { uid: createdDocument.uid },
      include: { subjects: true },
    })
    expect(updatedDbDocument).toBeDefined()
    expect(updatedDbDocument?.subjects).toHaveLength(2)
    expect(updatedDbDocument?.subjects[0].uid).toBe(subject1.uid)
    expect(updatedDbDocument?.subjects[1].uid).toBe(subject2.uid)

    // now lets remove the first subject
    const updatedDocumentData2 = new Document(
      'doc-2',
      Document.documentTypeFromString('JournalArticle'),
      OAStatus.GREEN,
      '2023-02-01',
      new Date('2023-02-01T00:00:00.000Z'),
      new Date('2023-02-01T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('Subject Test Document', 'en')],
      [], // No abstracts
      [subject2], // only the second subject
      [], // No contributions
      [],
    )

    await documentDAO.createOrUpdateDocument(updatedDocumentData2)

    const updatedDbDocument2 = await prisma.document.findUnique({
      where: { uid: createdDocument.uid },
      include: { subjects: true },
    })
    expect(updatedDbDocument2).toBeDefined()
    expect(updatedDbDocument2?.subjects).toHaveLength(1)
    expect(updatedDbDocument2?.subjects[0].uid).toBe(subject2.uid)
  })
  test('should persist document with HAL source record and custom fields', async () => {
    const halRecord = new DocumentRecord(
      'hal-doc-001',
      'hal0001',
      [new PublicationIdentifier('hal', 'hal-0001')],
      [
        new SourceContribution(
          LocRelator.AUTHOR,
          new SourcePerson(
            'hal-001-uid',
            'Matthieu Dupond',
            'hal',
            'hal-001-uid',
          ),
        ),
      ],
      ['Document', 'Book'],
      new Date('2022-01-01T00:00:00.000Z'),
      BibliographicPlatform.HAL,
      [new Literal('HAL Document Title', 'fr')],
      'https://hal.science/hal-doc-001',
      ['CNRS', 'UNIV-NANTES'],
      'notice',
      new SourceJournal(
        'uid-journal-0001',
        'ScanR',
        'scanr-0001',
        ['Journal du savoir'],
        'Les Grandes Editions',
      ),
    )

    const doc = new Document(
      'doc-hal-int',
      Document.documentTypeFromString('Book'),
      OAStatus.GREEN,
      '2019',
      new Date('2019-01-01T00:00:00.000Z'),
      new Date('2019-12-31T23:59:59.000Z'),
      OAStatus.DIAMOND,
      [new Literal('HAL Document Title', 'fr')],
      [],
      [],
      [],
      [halRecord],
    )

    await documentDAO.createOrUpdateDocument(doc)

    const documentFromDB = await prisma.document.findUnique({
      where: { uid: 'doc-hal-int' },
      include: {
        records: {
          include: {
            identifiers: true,
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
          },
        },
      },
    })

    expect(documentFromDB).toBeDefined()
    expect(documentFromDB?.records).toHaveLength(1)
    const record = documentFromDB!.records[0]
    expect(record.uid).toBe('hal-doc-001')
    expect(record.sourceIdentifier).toBe('hal0001')
    expect(record.identifiers).toHaveLength(1)
    expect(record.identifiers[0].type).toBe('HAL')
    expect(record.identifiers[0].value).toBe('hal-0001')
    expect(record.contributions).toHaveLength(1)
    expect(record.contributions[0].role).toBe('author')
    expect(record.contributions[0].person.uid).toBe('hal-001-uid')
    expect(record.documentTypes).toEqual(
      expect.arrayContaining(['Document', 'Book']),
    )
    expect(record.publicationDate?.toString()).toBe(
      new Date('2022-01-01T00:00:00.000Z').toString(),
    )
    expect(record.platform).toBe('hal')
    expect(record.url).toBe('https://hal.science/hal-doc-001')
    expect(record.halSubmitType).toBe('notice')
    expect(record.halCollectionCodes).toEqual(
      expect.arrayContaining(['CNRS', 'UNIV-NANTES']),
    )
    expect(record.journal?.uid).toBe('uid-journal-0001')
  })

  test('should delete specific concepts from a document', async () => {
    // Create two concepts
    const concept1 = await prisma.concept.create({
      data: {
        uid: 'concept-delete-1',
        uri: 'http://example.com/concept-delete-1',
      },
    })
    const concept2 = await prisma.concept.create({
      data: {
        uid: 'concept-delete-2',
        uri: 'http://example.com/concept-delete-2',
      },
    })

    // Create a document and link both concepts
    await prisma.document.create({
      data: {
        uid: 'doc-with-concepts',
        documentType: 'JournalArticle',
        publicationDate: '2022',
        publicationDateStart: new Date('2022-01-01'),
        publicationDateEnd: new Date('2022-12-31'),
        subjects: {
          connect: [{ id: concept1.id }, { id: concept2.id }],
        },
      },
    })

    // Ensure both subjects are linked
    let subjects = await prisma.document.findUnique({
      where: { uid: 'doc-with-concepts' },
      include: { subjects: true },
    })
    expect(subjects?.subjects).toHaveLength(2)

    // Delete concept1 from the document
    const dao = new DocumentDAO()
    await dao.deleteConceptsFromDocument('doc-with-concepts', [
      'concept-delete-1',
    ])

    // Verify only concept2 remains
    subjects = await prisma.document.findUnique({
      where: { uid: 'doc-with-concepts' },
      include: { subjects: true },
    })
    expect(subjects?.subjects).toHaveLength(1)
    expect(subjects?.subjects[0].uid).toBe('concept-delete-2')
  })
})
