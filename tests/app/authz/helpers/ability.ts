import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { abilityFromAuthzContext, userToAuthzContext } from '@/app/auth/ability'
import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

export const abilityForPersonUid = async (personUid: string) => {
  const dao = new UserDAO()
  const user = await dao.getUserByIdentifier(
    new PersonIdentifier(DbPersonIdentifierType.local, personUid),
  )
  if (!user) throw new Error(`User not found for personUid=${personUid}`)
  const ctx = userToAuthzContext(user, String(user.id))
  const ability = abilityFromAuthzContext(ctx)
  return { ability, ctx }
}
