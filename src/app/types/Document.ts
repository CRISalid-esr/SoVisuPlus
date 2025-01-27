import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'

class Document {
  constructor(
    public uid: string,
    public titles: Array<Literal>,
    public abstracts: Array<Literal>,
    public contributions: Array<Contribution> = [],
  ) {}
}

export { Document }
