import type { StorybookConfig } from '@storybook/tanstack-react';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/tanstack-react"
};
export default config;