import { Person } from '@/types/Person'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'

class Contribution {
  constructor(
    public person: Person,
    public roles: LocRelator[] = [], // Store multiple roles as an array of enums
    public rank?: number | null,
  ) {}

  getRoleLabels(): string[] {
    return this.roles.map((role) => LocRelatorHelper.toLabel(role))
  }
}

export { Contribution }
