import type { Config } from "jest";

const SETUP_FILE = "<rootDir>/src/__tests__/setup/setupFile.ts";

const config: Config = {
  preset: "ts-jest",

  projects: [
    //  Unit 
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      clearMocks: true,
      setupFilesAfterEnv: [SETUP_FILE],
    },

    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/__tests__/integration/**/*.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      clearMocks: true,
      globalSetup: "<rootDir>/src/__tests__/setup/globalSetup.ts",
      globalTeardown: "<rootDir>/src/__tests__/setup/globalTeardown.ts",
      setupFilesAfterEnv: [SETUP_FILE],
    },
  ],

  collectCoverageFrom: [
    "src/domains/**/*.service.ts",
    "src/domains/**/*.repository.ts",
    "src/domains/**/*.validator.ts",
    "src/shared/utils/*.ts",
    "src/infra/pubsub/*.ts",
    "src/infra/cache/*.ts",
  ],

  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
    },
  },
};

export default config;