module.exports = {
  /*
   * Resolve and load @commitlint/config-conventional from node_modules.
   * Referenced packages must be installed
   */
  extends: ['@commitlint/config-conventional'],
  /*
   * Any rules defined here will override rules from @commitlint/config-conventional
   */
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'Feature',
        'Fix',
        'Docs',
        'Style',
        'Refactor',
        'Test',
        'Revert',
        'Other',
        'Chore',
      ],
    ],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', ['sentence-case']],
    'scope-enum': [2, 'always', []],
    'scope-case': [
      2,
      'always',
      ['pascal-case', 'sentence-case', 'start-case'],
    ],
    'scope-empty': [2, 'never'],
    'subject-case': [
      2,
      'always',
      ['lower-case', 'sentence-case', 'start-case'],
    ],
    'subject-empty': [2, 'never'],
  },
};
