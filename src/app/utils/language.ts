export const resolveLanguage = async (
  params: Promise<{ lang: string }>,
  messages: Record<string, Record<string, string>>,
) => {
  const { lang } = await params
  return {
    lang,
    selectedMessages: messages[lang] || messages['en'], // Fallback to 'en' if lang is invalid
  }
}
