import { AMQPPersonMessage } from '@/types/AMQPPersonMessage'
import { PersonGraphQLClient } from '@/lib/graphql/PersonGraphQLClient'
import { UserDAO } from '@/lib/daos/UserDAO'
import { Person } from '@/app/types/Person'
import { MessageProcessingWorker } from '@/lib/amqp/workers/MessageProcessingWorker'
import { Person as DbPerson } from '@prisma/client'
import { PersonDAO } from '@/lib/daos/PersonDAO'

/**
 * Worker for processing person-related messages
 */
export class PersonWorker extends MessageProcessingWorker<AMQPPersonMessage> {
  private personGraphQLClient: PersonGraphQLClient
  private userDAO: UserDAO
  private personDAO: PersonDAO

  /**
   * Constructor
   * @param message - The person message to process
   */
  constructor(message: AMQPPersonMessage) {
    super(message)
    this.personGraphQLClient = new PersonGraphQLClient()
    this.personDAO = new PersonDAO()
    this.userDAO = new UserDAO()
  }

  /**
   * Process a person message by fetching data from the graph and updating the database
   */
  public async process(): Promise<void> {
    const { uid } = this.message.fields
    console.log(`Processing person with UID: ${uid}`)

    try {
      const person: Person | null =
        await this.personGraphQLClient.getPersonByUid(uid)

      if (person) {
        console.log(`Person data retrieved: ${JSON.stringify(person)}`)
        const dbPerson: DbPerson =
          await this.personDAO.createOrUpdatePerson(person)
        if (dbPerson.external) {
          console.log(`Person {${uid}} is external, skipping user creation`)
          return
        }
        await this.userDAO.createOrUpdateUser(dbPerson.id)
      } else {
        console.warn(`No person data found for UID: ${uid}`)
      }
    } catch (error) {
      console.error(`Failed to process person message for UID: ${uid}`, error)
      throw error
    }
  }
}
