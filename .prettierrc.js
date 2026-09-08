/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-packagejson'],
  singleQuote: true,
  overrides: [
    {
      // oakum rejects single-quoted package keys in bump-file frontmatter
      files: '.changeset/*.md',
      options: { singleQuote: false },
    },
  ],
};
