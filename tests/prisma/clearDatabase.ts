import { PrismaClient } from '@prisma/client'

export async function clearDatabase(prisma: PrismaClient) {
  await prisma.$transaction([
    prisma.personIdentifier.deleteMany(),
    prisma.user.deleteMany(),
    prisma.person.deleteMany(),
  ])
}
