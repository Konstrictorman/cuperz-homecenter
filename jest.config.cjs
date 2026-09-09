/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  // Default transform only matches .js/.jsx/.ts/.tsx; add .mjs for MSW's deps.
  transform: {
    '^.+\\.m?[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/styleMock.cjs',
    '^#/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // MSW and its dependency graph ship as ESM-only; let babel-jest transform them.
  transformIgnorePatterns: [
    '/node_modules/(?!(?:\\.pnpm/)?(msw|@mswjs|@bundled-es-modules|rettime|until-async|strict-event-emitter|headers-polyfill|outvariant|is-node-process|@open-draft|graphql|tough-cookie|type-fest|@faker-js)/)',
  ],
}
