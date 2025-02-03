import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Person as DbPerson, Prisma } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'

interface FetchDocumentsFromDBParams {
  searchTerm: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
}

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to create or update
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const { uid, titles, abstracts, contributions } = document

    try {
      let dbDocument = (await this.prismaClient.document.findUnique({
        where: { uid: uid },
        include: {
          titles: true, // Include related titles
          abstracts: true, // Include related abstracts
        },
      })) as DbDocument | null

      if (!dbDocument) {
        dbDocument = (await this.prismaClient.document.create({
          data: { uid: uid },
          include: {
            titles: true, // Include related titles
            abstracts: true, // Include related abstracts
          },
        })) as DbDocument
      }

      for (const title of titles) {
        await this.prismaClient.documentTitle.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: title.language ?? null,
            },
          },
          update: {
            value: title.value,
          },
          create: {
            documentId: dbDocument.id,
            language: title.language ?? null,
            value: title.value,
          },
        })
      }
      for (const abstract of abstracts) {
        await this.prismaClient.documentAbstract.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: abstract.language ?? null,
            },
          },
          update: {
            value: abstract.value,
          },
          create: {
            documentId: dbDocument.id,
            language: abstract.language ?? null,
            value: abstract.value,
          },
        })
      }

      for (const contribution of contributions) {
        let person: DbPerson
        try {
          person = await new PersonDAO().createOrUpdatePerson(
            contribution.person,
          )
        } catch (error) {
          console.error(
            `Failed to create or update person for contribution: ${contribution}`,
            error,
          )
          // don't discard the whole document if a person fails to create/update
          // just skip this contribution
          continue
        }

        const { id: personId } = person
        const { id: documentId } = dbDocument
        try {
          await this.prismaClient.contribution.create({
            data: {
              personId,
              documentId,
              role: 'AUTHOR', // You can dynamically determine the role if necessary
            },
          })
        } catch (error) {
          console.error(
            `Failed to create contribution for person ID: ${personId} and document ID: ${documentId}`,
            error,
          )
          // don't discard the whole document if a contribution fails to create
          // just skip this contribution
          continue
        }
      }
      return dbDocument
    } catch (error) {
      console.error('Error during document creation or update:', error as Error)
      throw new Error(
        `Failed to create or update document: ${(error as Error).message}`,
      )
    }
  }

  public async fetchDocumentsFromDB({
    searchTerm,
    page,
    pageSize,
    columnFilters,
    sorting,
  }: FetchDocumentsFromDBParams): Promise<{
    documents: DbDocument[]
    totalItems: number
  }> {
    const skip = (page - 1) * pageSize

     let where: Prisma.DocumentWhereInput = {}

     if(searchTerm){
        where = {
          OR: [
            {
              titles: {
                some: {
                  value: {
                    contains: searchTerm,
                  },
                },
              },
            },
            {
              abstracts: {
                some: {
                  value: {
                    contains: searchTerm,
                  },
                },
              },
            },
            {
              contributions: {
                some: {
                  person: {
                    displayName: {
                      contains: searchTerm,
                    },
                  },
                },
              },
            },
          ],
        }
      }

     columnFilters.forEach((filter) => {
      if (filter.id === 'titles') {
        where = {
          ...where,
          titles: {
            some: {
              value: {
                contains: filter.value,
              },
            },
          },
        }
      }

      if (filter.id === 'abstracts') {
        where = {
          ...where,
          abstracts: {
            some: {
              value: {
                contains: filter.value,
              },
            },
          },
        }
      }

      if (filter.id === 'contributions') {
        where = {
          ...where,
          contributions: {
            some: {
              person: {
                displayName: {
                  contains: filter.value,
                },
              },
            },
          },
        }
      }
    })



    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = sorting.map((sort) => {
      if (sort.id === 'contributions') {
        return {
          contributions: {
            _count: sort.desc ? 'desc' : 'asc',
          },
        };
      }


      if (sort.id === 'titles') {
        return {
          titles: {
            _count: sort.desc ? 'desc' : 'asc',
          },
        };
      }
      return { [sort.id]: sort.desc ? 'desc' : 'asc' };
    });




    const documents = await this.prismaClient.document.findMany({
      where,  
      skip,
      take: pageSize,
      orderBy,
      include: {
        titles:true,
        abstracts:true  ,
        contributions: {
          include: {
            person: true
          },
        },
      },
    })


    const totalItems = await this.prismaClient.document.count({ where })



    return {
      documents,
      totalItems,
    }
  }
}
