module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
    //'plugin:prettier/recommended',
  ],
  plugins: [
    'prettier',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    "no-console": 0,
    "arrow-parens": ["error", "always"],
    yoda: [
      "error",
      "never",
      {
        "exceptRange": true
      },
    ],
    "import/prefer-default-export": 0,
    "func-names": 0,
    "no-param-reassign": 0,
  },
};