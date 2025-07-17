import { DocumentService } from '@/lib/services/DocumentService'
import prisma from '@/lib/daos/prisma'

describe('DocumentService Integration Tests', () => {
  const service = new DocumentService()

  beforeEach(async () => {
    await prisma.action.deleteMany()
    await prisma.document.updateMany({ data: { journalId: null } }) // foreign key constraint workaround
    await prisma.document.deleteMany()
    await prisma.person.deleteMany()
    await prisma.user.deleteMany()
    await prisma.concept.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('should delete a concept from a document and create an action', async () => {
    // Create test user with linked person
    const person = await prisma.person.create({
      data: {
        uid: 'local-test-person',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        external: false,
        normalizedName: 'test user',
      },
    })

    await prisma.personIdentifier.create({
      data: {
        personId: person.id,
        type: 'LOCAL',
        value: 'local-test-person',
      },
    })

    await prisma.user.create({
      data: {
        personId: person.id,
      },
    })

    // Create concepts
    const concept1 = await prisma.concept.create({
      data: {
        uid: 'concept-service-1',
        uri: 'http://example.com/concept1',
      },
    })

    const concept2 = await prisma.concept.create({
      data: {
        uid: 'concept-service-2',
        uri: 'http://example.com/concept2',
      },
    })

    // Create document with both concepts
    const document = await prisma.document.create({
      data: {
        uid: 'doc-service-1',
        documentType: 'JournalArticle',
        publicationDate: '2024',
        publicationDateStart: new Date('2024-01-01'),
        publicationDateEnd: new Date('2024-12-31'),
        subjects: {
          connect: [{ id: concept1.id }, { id: concept2.id }],
        },
      },
    })

    // Check both concepts are linked
    let linkedSubjects = await prisma.document.findUnique({
      where: { uid: document.uid },
      include: { subjects: true },
    })
    expect(linkedSubjects?.subjects).toHaveLength(2)

    // Perform deletion
    await service.deleteConceptsFromDocument(
      'doc-service-1',
      ['concept-service-1'],
      'local-test-person',
    )

    // Concept should be unlinked
    linkedSubjects = await prisma.document.findUnique({
      where: { uid: document.uid },
      include: { subjects: true },
    })

    expect(linkedSubjects?.subjects).toHaveLength(1)
    expect(linkedSubjects?.subjects[0].uid).toBe('concept-service-2')

    // Action should be created
    const actions = await prisma.action.findMany({
      where: { targetUid: 'doc-service-1' },
    })

    expect(actions).toHaveLength(1)
    expect(actions[0].actionType).toBe('REMOVE')
    expect(actions[0].parameters).toEqual({
      conceptUids: ['concept-service-1'],
    })
    expect(actions[0].personUid).toBe('local-test-person')
  })
})
