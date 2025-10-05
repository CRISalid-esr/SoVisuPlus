import { RolesFileSeed } from '@/lib/services/RoleConfigService'

/**
 * Service for handling permissions and roles.
 */
export class RoleService {
  async reset(normalized: RolesFileSeed) {
    console.log('Resetting roles and permissions with:', normalized)
  }
}
