/**
 * PayGate ESLint Base Configuration Preset
 */
export default {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'no-duplicate-imports': 'error',
  },
};
