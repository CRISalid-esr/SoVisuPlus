import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import YAML from 'yaml'
import { RoleConfigService } from '@/lib/services/RoleConfigService'

async function main() {
  const argPath = process.argv[2]
  const filePath = path.resolve(process.cwd(), argPath ?? 'rbac.roles.yaml')

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
