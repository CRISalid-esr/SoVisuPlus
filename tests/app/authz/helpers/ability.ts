import { UserDAO } from '@/lib/daos/UserDAO'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { abilityFromAuthzContext, userToAuthzContext } from '@/app/auth/ability'

export async function abilityForPersonUid(personUid: string) {
  const dao = new UserDAO()
  const user = await dao.getUserByIdentifier({
    type: PersonIdentifierType.LOCAL,
    value: personUid,
  })
  if (!user) throw new Error(`User not found for personUid=${personUid}`)
  const ctx = userToAuthzContext(user, String(user.id))
  const ability = abilityFromAuthzContext(ctx)
  return { ability, ctx }
}
