import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationWithRelations as DbAuthorityOrganization} from '@/prisma-schema/extended-client'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'

export class AuthorityOrganizationDAO extends AbstractDAO {
  /**
   * Create or update a AuthorityOrganization record in the database
   * @param authority - The AuthorityOrganization object to create or update
   * @returns The created or updated AuthorityOrganization record
   */
  public async createOrUpdateAuthorityOrganization(authority: AuthorityOrganization): Promise<DbAuthorityOrganization> {
    const {
      uid,
      displayNames,
      places,
      identifiers
    } = authority
    try{
      let dbAuthority : DbAuthorityOrganization | null = await this.prismaClient.authorityOrganization.findUnique({
        where : {uid: uid},
        include:{
          identifiers:true
        }
      })
      if (!dbAuthority) {
        dbAuthority = await this.prismaClient.authorityOrganization.create({
          data:{
            uid:uid,
            displayNames:displayNames,
            places:places,
          },
          include:{
            identifiers:true
          }
        })
      }else{
        dbAuthority = await this.prismaClient.authorityOrganization.update({
          where : {uid: uid},
          data : {
            uid:uid,
            displayNames:displayNames,
            places:places,
          },
          include:{
            identifiers:true
          }
        })
      }
      await this.prismaClient.authorityOrganizationIdentifier.deleteMany({
        where: {organizationId : dbAuthority.id}
      })
      const idsToAdd = []
      for(const identifier of identifiers){
        const idType = AuthorityOrganizationIdentifier.authorityOrganizationIdentifierTypeFromString(identifier.type)
        if(idType){
          const id = await this.prismaClient.authorityOrganizationIdentifier.create({
            data:{
              type: idType,
              value: identifier.value,
              organizationId: dbAuthority.id
            }
          })
          idsToAdd.push(id)
        }else{
         console.error(`Invalid identifier type ${identifier.type} for authority organization UID ${dbAuthority.uid}`)
        }
      }
      dbAuthority = await this.prismaClient.authorityOrganization.update({
        where :{ uid:uid},
        data:{
          identifiers:{
            connect: idsToAdd
          }
        },
        include:{
          identifiers:true
        }
      })
      return dbAuthority
    }catch(error){
      console.error('Error during authority organization creation or update:', error as Error)
      throw new Error(
        `Failed to create or update authority organization: ${(error as Error).message}`,
      )
    }
  }
}