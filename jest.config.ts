import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__tests__"],
  globalSetup: "<rootDir>/src/__tests__/integration/setup/globalSetup.ts",
  globalTeardown: "<rootDir>/src/__tests__/integration/setup/globalTeardown.ts",
  setupFilesAfterFramework: [
    "<rootDir>/src/__tests__/integration/setup/setupFile.ts",
  ],
  testMatch: [
    "**/__tests__/**/*.test.ts",
  ],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;