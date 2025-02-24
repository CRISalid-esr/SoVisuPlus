import { Literal } from '@/types/Literal'

class Concept {
  constructor(
    public uid: string,
    public altLabels: Array<Literal>,
    public prefLabels: Array<Literal>,
    public uri: string | null = null,
  ) {}
}

export { Concept }
