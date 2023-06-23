import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Box, IconButton, ResponsiveValue, useColorMode, useColorModeValue } from "@chakra-ui/react";
import * as CSS from "csstype";
import React, { FunctionComponent } from "react";

type ColorModeToggleProps = {
  /**
   * Margin
   */
  m?: string;
  /**
   * Margin top
   */
  mt?: string;
  /**
   * Margin left
   */
  ml?: string;
  /**
   * Margin bottom
   */
  mb?: string;
  /**
   * Margin right
   */
  mr?: string;
  /**
   * Display property of the component
   */
  display?: ResponsiveValue<CSS.Property.Display>;
  /**
   * Hide below given dimenion
   */
  hideBelow?: string;
  /**
   * Hide from given dimension
   */
  hideFrom?: string;
};

const ColorModeToggle: FunctionComponent<ColorModeToggleProps> = (props): JSX.Element => {
  const { toggleColorMode } = useColorMode();
  const displayLightModeToggle = useColorModeValue("none", "display");
  const displayDarkModeToggle = useColorModeValue("display", "none");

  return (
    <Box {...props}>
      <IconButton
        aria-label="Dark mode"
        display={displayDarkModeToggle}
        onClick={toggleColorMode}
        icon={<MoonIcon />}
      />
      <IconButton
        aria-label="Light mode"
        display={displayLightModeToggle}
        onClick={toggleColorMode}
        icon={<SunIcon />}
      />
    </Box>
  );
};

export default ColorModeToggle;
