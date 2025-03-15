module.exports = {
    env: {
        node: true,
        es6: true,
        jest: true
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
    },
    rules: {
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'semi': ['error', 'always'],
        'quotes': ['warn', 'single'],
        'indent': ['warn', 2],
        'comma-dangle': ['warn', 'never'],
        'no-trailing-spaces': 'warn',
        'eol-last': ['warn', 'always']
    },
    ignorePatterns: [
        'node_modules/',
        'coverage/',
        'public/',
        'uploads/',
        'data/',
        'logs/'
    ]
}; 