import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.mdx", "../src/**/*.stories.@(js|jsx|ts|tsx)"],
  // Current chakra addon is incompatible
  // addons: ['@storybook/addon-links', '@storybook/addon-essentials', '@chakra-ui/storybook-addon'],
  addons: ["@storybook/addon-links", "@storybook/addon-essentials"],
  core: {},
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(config) {
    // Merge custom configuration into the default config
    return mergeConfig(config, {
      // Set relative base path to support deployment on path like /storybook
      base: "./",
      optimizeDeps: {
        include: ["react-is", "@base2/pretty-print-object"],
      },
    });
  },
  docs: {
    autodocs: true,
  },
};
export default config;
