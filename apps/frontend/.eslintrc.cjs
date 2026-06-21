module.exports = {
    root: true,
    reportUnusedDisableDirectives: false,
    env: { browser: true, es2020: true },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['@typescript-eslint', 'react-hooks'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    ignorePatterns: ['dist', '.eslintrc.cjs'],
    rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
        'prefer-const': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off',
        'no-prototype-builtins': 'off',
        'no-empty': 'off',
        'no-useless-catch': 'off',
        'no-case-declarations': 'off',
        'no-useless-escape': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
    },
}