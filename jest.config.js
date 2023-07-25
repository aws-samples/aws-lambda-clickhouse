module.exports = {
  projects: [
    "<rootDir>/test/jest.unit.config.js",
    "<rootDir>/test/jest.integration.config.js",
  ],
  testEnvironment: "node",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
