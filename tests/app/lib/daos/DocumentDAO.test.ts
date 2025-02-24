import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Document } from '@/types/Document'
import { Person } from '@/types/Person'
import prisma from '@/lib/daos/prisma'
import { Literal } from '@/types/Literal'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { Contribution } from '@/types/Contribution'

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
      '2023-01-01',
      new Date('2023-01-01T00:00:00.000Z'),
      new Date('2023-01-01T23:59:59.000Z'),
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
      '2023-01-01',
      new Date('2023-01-01T00:00:00.000Z'),
      new Date('2023-01-01T23:59:59.000Z'),
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
})
