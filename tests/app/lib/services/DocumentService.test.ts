import { DocumentService } from '@/lib/services/DocumentService'
import prisma from '@/lib/daos/prisma'
import { DocumentType } from '@/types/Document'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'

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
        type: 'local',
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
  test('should update document type and create an UPDATE action', async () => {
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
        type: 'local',
        value: 'local-test-person',
      },
    })

    await prisma.user.create({
      data: { personId: person.id },
    })

    await prisma.document.create({
      data: {
        uid: 'doc-service-type-1',
        documentType: 'JournalArticle',
        publicationDate: '2024',
        publicationDateStart: new Date('2024-01-01'),
        publicationDateEnd: new Date('2024-12-31'),
      },
    })

    await service.updateDocumentType(
      'doc-service-type-1',
      DocumentType.Book,
      'local-test-person',
    )

    const updated = await prisma.document.findUnique({
      where: { uid: 'doc-service-type-1' },
      select: { documentType: true },
    })
    expect(updated?.documentType).toBe('Book')

    const actions = await prisma.action.findMany({
      where: { targetUid: 'doc-service-type-1' },
      orderBy: { id: 'desc' },
    })

    expect(actions.length).toBeGreaterThanOrEqual(1)
    const action = actions[0]
    expect(action.actionType).toBe('UPDATE')
    expect(action.targetType).toBe('DOCUMENT')
    expect(action.path).toBe('documentType')
    expect(action.parameters).toEqual({ value: 'Book' })
    expect(action.personUid).toBe('local-test-person')
  })

  describe('document writes roll back with their actions', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    // A user (with its person and local identifier) to sign the actions
    const createUser = async () => {
      const person = await prisma.person.create({
        data: {
          uid: 'local-atomic-person',
          firstName: 'Atomic',
          lastName: 'User',
          normalizedName: 'atomic user',
          external: false,
          identifiers: {
            create: { type: 'local', value: 'local-atomic-person' },
          },
        },
      })
      await prisma.user.create({ data: { personId: person.id } })
      return 'local-atomic-person'
    }

    const createDocument = (uid: string) =>
      prisma.document.create({
        data: {
          uid,
          documentType: 'JournalArticle',
          titles: { create: [{ language: 'fr', value: 'Titre conservé' }] },
        },
      })

    const failActionCreation = () =>
      jest
        .spyOn(ActionDAO.prototype, 'createAction')
        .mockRejectedValueOnce(new Error('action failure'))

    test('modifyTitles keeps the old titles when the action fails', async () => {
      const userName = await createUser()
      await createDocument('doc-atomic-titles')
      const document = await service.fetchDocumentById('doc-atomic-titles')
      failActionCreation()

      await expect(
        service.modifyTitles(
          document!,
          [{ language: 'en', value: 'New title' }],
          userName,
        ),
      ).rejects.toThrow('Error modifying titles of document')

      const titles = await prisma.documentTitle.findMany({
        where: { document: { uid: 'doc-atomic-titles' } },
      })
      expect(titles.map((title) => title.value)).toEqual(['Titre conservé'])
      expect(await prisma.action.count()).toBe(0)
    })

    test('addConceptsToDocument links no concept when the action fails', async () => {
      const userName = await createUser()
      await createDocument('doc-atomic-concepts')
      failActionCreation()

      await expect(
        service.addConceptsToDocument(
          'doc-atomic-concepts',
          [
            {
              uid: 'concept-atomic',
              uri: 'http://example.com/concept-atomic',
              prefLabels: [],
              altLabels: [],
            },
          ],
          userName,
        ),
      ).rejects.toThrow('Error adding concepts to document')

      const document = await prisma.document.findUniqueOrThrow({
        where: { uid: 'doc-atomic-concepts' },
        include: { subjects: true },
      })
      expect(document.subjects).toEqual([])
      expect(
        await prisma.concept.count({ where: { uid: 'concept-atomic' } }),
      ).toBe(0)
      expect(await prisma.action.count()).toBe(0)
    })

    test('saveContributions records no action when the document cannot be flagged', async () => {
      const userName = await createUser()
      await createDocument('doc-atomic-contributions')
      jest
        .spyOn(DocumentDAO.prototype, 'markDocumentsWaitingForUpdate')
        .mockRejectedValueOnce(new Error('flag failure'))

      await expect(
        service.saveContributions('doc-atomic-contributions', [], userName),
      ).rejects.toThrow('Error saving contributions')

      expect(await prisma.action.count()).toBe(0)
      const document = await prisma.document.findUniqueOrThrow({
        where: { uid: 'doc-atomic-contributions' },
      })
      expect(document.state).toBe('default')
    })
  })
})
