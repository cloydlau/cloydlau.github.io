import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
  },
  {
    rules: {
      'brace-style': ['error', 'stroustrup', { allowSingleLine: false }],
      'curly': ['error', 'all'],
      'no-console': 'off',
    },
  },
)
