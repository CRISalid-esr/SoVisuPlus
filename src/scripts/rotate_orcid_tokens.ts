import { PrismaClient } from '@prisma/client'
import {
  decryptString,
  encryptString,
  getKid,
  isEncryptedString,
} from '@/utils/crypto/fieldEncryption'
import { loadKeyringFromEnv } from '@/utils/crypto/keyring'
import { PersonDAO } from '../app/lib/daos/PersonDAO'

const prisma = new PrismaClient()

const main = async (): Promise<void> => {
  const keyring = loadKeyringFromEnv()
  const primaryKid = keyring.primaryKid

  const rows = await prisma.orcidIdentifier.findMany({
    select: { id: true, accessToken: true, refreshToken: true },
  })

  let scanned = 0
  let rotated = 0
  let skipped = 0

  for (const row of rows) {
    scanned += 1

    const currentKidA =
      row.accessToken && isEncryptedString(row.accessToken)
        ? getKid(row.accessToken)
        : null
    const currentKidR =
      row.refreshToken && isEncryptedString(row.refreshToken)
        ? getKid(row.refreshToken)
        : null

    const alreadyPrimary =
      currentKidA === primaryKid && currentKidR === primaryKid

    if (alreadyPrimary) {
      skipped += 1
      continue
    }

    const aad = PersonDAO.getORCIDIdentifierAad(row.id)

    const accessPt = row.accessToken
      ? decryptString(row.accessToken, keyring, { aad })
      : ''
    const refreshPt = row.refreshToken
      ? decryptString(row.refreshToken, keyring, { aad })
      : ''

    const newAccess = encryptString(accessPt, keyring, { aad })
    const newRefresh = encryptString(refreshPt, keyring, { aad })

    await prisma.orcidIdentifier.update({
      where: { id: row.id },
      data: { accessToken: newAccess, refreshToken: newRefresh },
    })

    rotated += 1
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ scanned, rotated, skipped, primaryKid }, null, 2),
  )
}

main()
  .catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
