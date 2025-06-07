class JournalIdentifier {
  constructor(
    public type: string,
    public value: string,
    public format: string | null = null,
  ) {}
}

export { JournalIdentifier }
