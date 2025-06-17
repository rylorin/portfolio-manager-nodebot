// 1. import `extendTheme` or `extendBaseTheme` function
import { createSystem, defaultConfig, SystemConfig } from "@chakra-ui/react";
// `@chakra-ui/theme` is a part of the base install with `@chakra-ui/react`

// const { Button, Link, Code, Table, Tooltip, Select, Textarea, Badge, Spinner } = chakraTheme.components;

// 2. Add your theme extensions
const extensions: SystemConfig = {
  theme: {
    tokens: {
      // config: { initialColorMode: "system", useSystemColorMode: true },
      // components: {
      //   Button,
      //   Link,
      //   Code,
      //   Table,
      //   Tooltip,
      //   Select,
      //   Textarea,
      //   Badge,
      //   Spinner,
      // },
      // styles: {
      //   global: {
      //     // Test to verify correct loading of custom theme
      //     //   'p.chakra-text': { color: 'red' },
      //   },
      // },
      // colors: {
      //   primary: {
      //     // Example, unused
      //     100: "#E5FCF1",
      //     200: "#27EF96",
      //     300: "#10DE82",
      //     400: "#0EBE6F",
      //     500: "#0CA25F",
      //     600: "#0A864F",
      //     700: "#086F42",
      //     800: "#075C37",
      //     900: "#064C2E",
      //   },
      // },
    },
  },
};

// 3. extend the theme
export const system = createSystem(defaultConfig, extensions);

export default system;
