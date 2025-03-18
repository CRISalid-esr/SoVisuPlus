import { PersonIdentifierType } from '@prisma/client'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import prisma from '@/lib/daos/prisma'
import { PersonMembership } from '@/types/PersonMembership'
import { ResearchStructure } from '@/types/ResearchStructure'
import { Literal } from '@/types/Literal'
import { ResearchStructureDAO } from '@/lib/daos/ResearchStructureDAO'

describe('PersonDAO Integration Tests', () => {
  let personDAO: PersonDAO

  beforeAll(() => {
    personDAO = new PersonDAO()
  })

  const personData: Person = new Person(
    'local-johndoe',
    false,
    'johndoe@example.com',
    'John',
    'Doe',
    'John Doe',
    [{ type: PersonIdentifierType.ORCID, value: '0000-0001-2345-6789' }],
    [
      new PersonMembership(
        new ResearchStructure(
          'local-structure',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          [],
        ),
        null,
        null,
        'MCF',
      ),
    ],
  )

  test('should create a new person with identifiers', async () => {
    const dbPerson = await personDAO.createOrUpdatePerson(personData)

    expect(dbPerson).toHaveProperty('id')
    expect(dbPerson.uid).toBe(personData.uid)
    expect(dbPerson.email).toBe(personData.email)

    const savedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: dbPerson.id },
    })

    expect(savedIdentifiers).toHaveLength(1)
    expect(savedIdentifiers[0]).toMatchObject({
      type: PersonIdentifierType.ORCID,
      value: '0000-0001-2345-6789',
      personId: dbPerson.id,
    })
  })

  test('should create a new person with memberships', async () => {
    const researchStructureDAO = new ResearchStructureDAO()
    const researchStructure =
      await researchStructureDAO.createOrUpdateResearchStructure(
        new ResearchStructure(
          'local-structure',
          'ACR',
          [new Literal('JD Laboratory', 'en')],
          [new Literal('Laboratory of John Doe', 'en')],
          [],
        ),
      )
    const dbPerson = await personDAO.createOrUpdatePerson(personData)

    expect(dbPerson).toHaveProperty('id')
    expect(dbPerson.uid).toBe(personData.uid)
    expect(dbPerson.email).toBe(personData.email)

    const savedMemberships = await prisma.membership.findMany({
      where: { personId: dbPerson.id },
      include: { researchStructure: true },
    })

    expect(savedMemberships).toHaveLength(1)
    expect(savedMemberships[0]).toMatchObject({
      personId: dbPerson.id,
      researchStructureId: researchStructure.id,
      positionCode: 'MCF',
    })
  })

  test('should update an existing person and replace identifiers', async () => {
    const initialPerson = await prisma.person.create({
      data: {
        uid: personData.uid,
        email: 'old-email@example.com',
        firstName: 'Old',
        lastName: 'Name',
      },
    })

    await prisma.personIdentifier.createMany({
      data: [
        {
          type: PersonIdentifierType.ORCID,
          value: '0000-0001-1111-1111',
          personId: initialPerson.id,
        },
      ],
    })

    const updatedPerson = await personDAO.createOrUpdatePerson(personData)

    expect(updatedPerson.email).toBe(personData.email)
    expect(updatedPerson.firstName).toBe(personData.firstName)
    expect(updatedPerson.lastName).toBe(personData.lastName)

    const updatedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: updatedPerson.id },
    })

    expect(updatedIdentifiers).toHaveLength(1)
    expect(updatedIdentifiers[0]).toMatchObject({
      type: PersonIdentifierType.ORCID,
      value: '0000-0001-2345-6789',
    })
  })

  test('should throw an error if conflicting identifiers are found', async () => {
    const conflictingPerson = await prisma.person.create({
      data: {
        uid: 'conflicting-person',
        email: 'conflict@example.com',
        firstName: 'Conflict',
        lastName: 'Person',
      },
    })

    await prisma.personIdentifier.create({
      data: {
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-2345-6789',
        personId: conflictingPerson.id,
      },
    })

    await expect(personDAO.createOrUpdatePerson(personData)).rejects.toThrow(
      'Failed to upsert person: Conflicting identifiers found: ORCID:0000-0001-2345-6789',
    )
  })

  test('should remove old identifiers and add new ones for the same person', async () => {
    const initialPerson = await prisma.person.create({
      data: {
        uid: personData.uid,
        email: personData.email,
        firstName: personData.firstName,
        lastName: personData.lastName,
      },
    })

    await prisma.personIdentifier.createMany({
      data: [
        {
          type: PersonIdentifierType.ORCID,
          value: '0000-0001-1111-1111',
          personId: initialPerson.id,
        },
      ],
    })

    const newPersonData = personData
    newPersonData.setIdentifiers([
      { type: PersonIdentifierType.SCOPUS_EID, value: '1234-5678-9012' },
      { type: PersonIdentifierType.IDREF, value: 'AB-1234-5678' },
    ])

    const updatedPerson = await personDAO.createOrUpdatePerson(newPersonData)

    const updatedIdentifiers = await prisma.personIdentifier.findMany({
      where: { personId: updatedPerson.id },
    })

    expect(updatedIdentifiers).toHaveLength(2)
    expect(updatedIdentifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: PersonIdentifierType.SCOPUS_EID,
          value: '1234-5678-9012',
        }),
        expect.objectContaining({
          type: PersonIdentifierType.IDREF,
          value: 'AB-1234-5678',
        }),
      ]),
    )
  })

  test('should append -1 to the slug when a second person with the same name is added', async () => {
    const person1 = new Person(
      'local-johndoe-1',
      false,
      'johndoe1@example.com',
      'John Doe',
      'John',
      'Doe',
      [{ type: PersonIdentifierType.ORCID, value: '0000-0001-2345-6789' }],
    )

    const person2 = new Person(
      'local-johndoe-2',
      false,
      'johndoe2@example.com',
      'John Doe',
      'John',
      'Doe',
      [{ type: PersonIdentifierType.ORCID, value: '0000-0001-9876-5432' }],
    )

    // Insert first person
    const dbPerson1 = await personDAO.createOrUpdatePerson(person1)
    expect(dbPerson1.slug).toBe('person:john-doe') // First one gets base slug

    // Insert second person with the same name
    const dbPerson2 = await personDAO.createOrUpdatePerson(person2)
    expect(dbPerson2.slug).toBe('person:john-doe-1') // Second one gets -1 suffix

    // Ensure both records exist in the database
    const savedPeople = await prisma.person.findMany({
      where: { lastName: 'Doe', firstName: 'John' },
    })

    expect(savedPeople).toHaveLength(2)
    expect(savedPeople.map((p) => p.slug)).toEqual([
      'person:john-doe',
      'person:john-doe-1',
    ])
  })
})
