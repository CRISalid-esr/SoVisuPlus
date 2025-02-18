import { Person } from '@/types/Person'
import { PersonIdentifierType } from '@prisma/client'
import { describe, it, expect } from '@jest/globals'

describe('Person', () => {
  it('should create a valid Person object', () => {
    const validPerson = new Person(
      'P123',
      true,
      'example@example.com',
      'John Doe',
      'John',
      'Doe',
      [
        { type: PersonIdentifierType.ORCID, value: '0000-0002-1825-0097' },
        { type: PersonIdentifierType.LOCAL, value: '12345' },
      ],
    )

    expect(validPerson).toBeInstanceOf(Person)
    expect(validPerson.uid).toBe('P123')
    expect(validPerson.external).toBe(true)
    expect(validPerson.email).toBe('example@example.com')
    expect(validPerson.displayName).toBe('John Doe')
    expect(validPerson.firstName).toBe('John')
    expect(validPerson.lastName).toBe('Doe')
    expect(validPerson.getIdentifiers()).toEqual([
      { type: PersonIdentifierType.ORCID, value: '0000-0002-1825-0097' },
      { type: PersonIdentifierType.LOCAL, value: '12345' },
    ])
  })

  it('should throw an error for invalid identifier types', () => {
    expect(() => {
      new Person('P456', false, null, 'Jane Doe', 'Jane', 'Doe', [
        { type: 'INVALID_TYPE' as PersonIdentifierType, value: '00000' },
      ])
    }).toThrowError(/INVALID_TYPE is not a valid PersonIdentifierType/)
  })

  it('should create a Person object from a DbPerson object', () => {
    const dbPerson = {
      id: 1,
      uid: 'P123',
      slug: 'alice-smith',
      external: true,
      email: 'example@example.com',
      displayName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      identifiers: [
        { type: PersonIdentifierType.ORCID, value: '0000-0002-1825-0097' },
        { type: PersonIdentifierType.LOCAL, value: '12345' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = Person.fromDbPerson(dbPerson)

    expect(result).toBeInstanceOf(Person)
    expect(result.uid).toBe('P123')
    expect(result.external).toBe(true)
    expect(result.email).toBe('example@example.com')
    expect(result.displayName).toBe('John Doe')
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Doe')
    expect(result.getIdentifiers()).toEqual([
      { type: PersonIdentifierType.ORCID, value: '0000-0002-1825-0097' },
      { type: PersonIdentifierType.LOCAL, value: '12345' },
    ])
  })

  it('should handle an empty identifiers array if not provided', () => {
    const dbPerson = {
      id: 1,
      uid: 'P789',
      slug: 'alice-smith',
      external: false,
      email: null,
      displayName: 'Alice Smith',
      firstName: 'Alice',
      lastName: 'Smith',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = Person.fromDbPerson(dbPerson)

    expect(result).toBeInstanceOf(Person)
    expect(result.uid).toBe('P789')
    expect(result.external).toBe(false)
    expect(result.email).toBeNull()
    expect(result.displayName).toBe('Alice Smith')
    expect(result.firstName).toBe('Alice')
    expect(result.lastName).toBe('Smith')
    expect(result.getIdentifiers()).toEqual([])
  })
})
