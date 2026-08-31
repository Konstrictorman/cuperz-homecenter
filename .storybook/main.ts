import tailwindcss from '@tailwindcss/vite';

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
  "framework": "@storybook/tanstack-react",
  async viteFinal(config) {
    // The app's stylesheet (`@import 'tailwindcss'`) needs this plugin to
    // compile; Storybook's own Vite pipeline doesn't include it by default.
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    return config;
  },
};
export default config;