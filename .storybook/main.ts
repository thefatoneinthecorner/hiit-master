import type { StorybookConfig } from '@storybook/preact-vite';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/preact-vite",
    "features": {
      "componentsManifest": true,
      "experimentalCodeExamples": true, // Speeds up Codex by generating optimal code snippets
    }
};
export default config;