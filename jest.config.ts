import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/tests"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  clearMocks: true,
  collectCoverageFrom: [
    "src/domains/**/*.service.ts",
    "src/domains/**/*.repository.ts",
    "src/domains/**/*.validator.ts",
    "src/shared/utils/*.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
    },
  },
};

export default config;