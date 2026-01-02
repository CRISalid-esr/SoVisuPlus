import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import YAML from 'yaml'
import { parseArgs } from 'node:util'
import { RoleConfigService } from '@/lib/services/RoleConfigService'

const main = async () => {
  const { values, positionals } = parseArgs({
    options: { file: { type: 'string', short: 'f' } },
    allowPositionals: true,
  })

  const fileArg = values.file ?? positionals[0] ?? 'rbac.roles.yaml'
  const filePath = path.resolve(process.cwd(), fileArg)

  const buf = await readFile(filePath, 'utf8')
  const parsed = YAML.parse(buf)

  const { roles, permissions } = await RoleConfigService.load(parsed)
  console.log(
    `Roles updated successfully from ${path.basename(filePath)} — ${roles} roles, ${permissions} permissions.`,
  )
}

main().catch((err) => {
  console.error('[init_roles] Failed:', err?.message ?? err)
  process.exit(1)
})
