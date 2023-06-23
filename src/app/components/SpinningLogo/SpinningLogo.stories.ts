import type { Meta, StoryObj } from "@storybook/react";

import SpinningLogo from "./SpinningLogo";

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
const meta = {
  title: "Component/SpinningLogo",
  component: SpinningLogo,
  tags: ["autodocs"],
} satisfies Meta<typeof SpinningLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const React: Story = {
  args: {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
    alt: "React logo",
  },
};
