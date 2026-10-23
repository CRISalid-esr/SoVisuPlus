import prisma from '@/lib/daos/prisma'
import { runInTransaction } from '@/lib/daos/transaction'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { ActionDAO } from '@/lib/daos/ActionDAO'
import { DbClient } from '@/lib/daos/AbstractDAO'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ActionTargetType, ActionType } from '@/types/Action'

describe('runInTransaction Integration Tests', () => {
  const personUid = 'person-tx-1'

  beforeEach(async () => {
    await prisma.person.create({
      data: {
        uid: personUid,
        email: 'tx@example.com',
        firstName: 'Trans',
        lastName: 'Action',
        normalizedName: 'trans action',
        external: false,
      },
    })
  })

  afterEach(async () => {
    await prisma.action.deleteMany()
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const writeIdentifierAndAction = async (tx: DbClient) => {
    const personDAO = new PersonDAO(tx)
    const actionDAO = new ActionDAO(tx)
    await personDAO.createIdentifier(
      new PersonIdentifier(PersonIdentifierType.idref, '127220747'),
      personUid,
    )
    await actionDAO.createAction({
      actionType: ActionType.ADD,
      targetType: ActionTargetType.PERSON,
      targetUid: personUid,
      path: 'identifiers',
      parameters: {},
      personUid,
    })
  }

  const countRows = async () => ({
    identifiers: await prisma.personIdentifier.count({
      where: { person: { uid: personUid } },
    }),
    actions: await prisma.action.count({ where: { targetUid: personUid } }),
  })

  test('commits writes made through two DAOs together', async () => {
    await runInTransaction(writeIdentifierAndAction)

    expect(await countRows()).toEqual({ identifiers: 1, actions: 1 })
  })

  test('rolls back writes made through two DAOs when the callback throws', async () => {
    await expect(
      runInTransaction(async (tx) => {
        await writeIdentifierAndAction(tx)
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(await countRows()).toEqual({ identifiers: 0, actions: 0 })
  })

  test("a tx-bound DAO's internal transaction joins the outer one", async () => {
    // upsertHalIdentifiers writes idHAL + hal_login in its own transaction;
    // bound to the outer client, both must roll back with it.
    await expect(
      runInTransaction(async (tx) => {
        await new PersonDAO(tx).upsertHalIdentifiers(
          personUid,
          new PersonIdentifier(PersonIdentifierType.idhals, 'jane-doe'),
          'jdoe',
        )
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect((await countRows()).identifiers).toBe(0)

    await runInTransaction(async (tx) => {
      await new PersonDAO(tx).upsertHalIdentifiers(
        personUid,
        new PersonIdentifier(PersonIdentifierType.idhals, 'jane-doe'),
        'jdoe',
      )
    })
    expect((await countRows()).identifiers).toBe(2)
  })
})
