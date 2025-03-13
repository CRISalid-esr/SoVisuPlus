import { ResearchStructure } from '@/types/ResearchStructure'

class PersonMembership {
  constructor(
    public researchStructure: ResearchStructure,
    public startDate?: string | null,
    public endDate?: string | null,
    public positionCode?: string | null,
  ) {}
}

export { PersonMembership }
