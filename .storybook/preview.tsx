import { Preview } from "@storybook/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const preview: Preview = {
  decorators: [(story) => <MemoryRouter>{story()}</MemoryRouter>],
};

export default preview;
