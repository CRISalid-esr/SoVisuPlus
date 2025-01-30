import ISO6391, { LanguageCode } from 'iso-639-1'

class Literal {
  constructor(
    public value: string,
    public language: LanguageCode | 'ul', // ISO 639-1 code or
    // undetermined language
  ) {
    if (language !== 'ul' && !ISO6391.validate(language)) {
      throw new Error(`Invalid ISO 639-1 language code: ${language}`)
    }
  }

  static fromObject(object: {
    language: string | null
    value: string
  }): Literal {
    let language = object.language
    if (language === null || !ISO6391.validate(language)) {
      language = 'ul'
    }
    return new Literal(object.value, language as LanguageCode | 'ul')
  }
}

export { Literal }
