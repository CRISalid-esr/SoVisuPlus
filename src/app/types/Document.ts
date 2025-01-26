import { Person } from './Person'
import { Literal } from '@/types/Literal'

class Document {
  constructor(
    public uid: string,
    public titles: Array<Literal>,
    public abstracts: Array<Literal>,
    public contributions: Array<Person> = [],
  ) {}
}

export { Document }
