import { Person } from './Person'

class Document {
  constructor(
    public uid: string,
    public titles: Record<string, string>,
    public contributions: Array<Person> = [],
  ) {}
}

export { Document }
