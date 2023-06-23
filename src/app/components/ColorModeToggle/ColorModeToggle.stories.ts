import type { Meta, StoryObj } from "@storybook/react";

import ColorModeToggle from "./ColorModeToggle";

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
const meta = {
  title: "Component/ColorModeToggle",
  component: ColorModeToggle,
  tags: ["autodocs"],
} satisfies Meta<typeof ColorModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Default: Story = {
  args: {
    m: "2",
  },
};
