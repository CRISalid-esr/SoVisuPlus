/** @type {import('@lingui/conf').LinguiConfig} */

module.exports = {
  locales: ['en', 'fr'],
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src'],
      // Test files must not contribute to the shipped catalog: they only assert on
      // ids that production already declares, and referencing ids via explicit
      // `id=`/`i18n.t()` in tests created duplicate/orphan catalog entries.
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
    },
  ],
  format: 'po',
}
