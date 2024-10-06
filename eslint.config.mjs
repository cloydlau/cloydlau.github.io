import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
    lessOpinionated: true,
  },
  {
    rules: {
      'brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
      'curly': ['error', 'all'],
      'no-console': 'off',
    },
  },
)
