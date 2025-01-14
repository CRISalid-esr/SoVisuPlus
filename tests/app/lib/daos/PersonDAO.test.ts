import { PersonIdentifierType } from '@prisma/client'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { Person } from '@/types/Person'
import prisma from '@/lib/daos/prisma'

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
})
