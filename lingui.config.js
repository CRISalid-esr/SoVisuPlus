/** @type {import('@lingui/conf').LinguiConfig} */

module.exports = {
  locales: ['en', 'cs', 'fr', 'zu'],
  pseudoLocale: 'zu',
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  format: 'po',
};
