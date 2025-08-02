import { EventBase } from '@/types/EventBase'

export type DataEventType = 'created' | 'updated' | 'deleted' | 'unchanged'

export class DataEvent extends EventBase {
  readonly type = 'data'

  constructor(
    public readonly objectType:
      | 'Document'
      | 'Person'
      | 'ResearchStructure'
      | 'User',
    public readonly objectUid: string,
    public readonly eventType: DataEventType,
    public readonly objectLabel?: string,
    public readonly impliedPeopleUids: string[] = [],
  ) {
    super()
  }

  toJSON() {
    return {
      type: this.type,
      objectType: this.objectType,
      objectUid: this.objectUid,
      eventType: this.eventType,
      objectLabel: this.objectLabel,
      impliedPeopleUids: this.impliedPeopleUids,
    }
  }
}
