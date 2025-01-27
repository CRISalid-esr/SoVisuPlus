import { Person } from '@/types/Person'

class Contribution {
  constructor(
    public person: Person,
    public role?: string | null,
    public rank?: number | null,
  ) {}
}

export { Contribution }
