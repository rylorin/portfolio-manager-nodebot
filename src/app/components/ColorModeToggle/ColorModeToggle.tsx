import { Box, IconButton, SystemStyleObject } from "@chakra-ui/react";
import { type FunctionComponent } from "react";
import { LuMoon as MoonIcon, LuSun as SunIcon } from "react-icons/lu";
import { useColorMode, useColorModeValue } from "../ui/color-mode";

interface ColorModeToggleProps {
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
  display?: SystemStyleObject["display"];
  /**
   * Hide below given dimension
   */
  hideBelow?: string;
  /**
   * Hide from given dimension
   */
  hideFrom?: string;
}

const ColorModeToggle: FunctionComponent<ColorModeToggleProps> = (props) => {
  const { toggleColorMode } = useColorMode();
  const displayLightModeToggle = useColorModeValue("none", "block");
  const displayDarkModeToggle = useColorModeValue("block", "none");

  return (
    <Box {...props}>
      <IconButton
        aria-label="Dark mode"
        display={displayDarkModeToggle}
        onClick={toggleColorMode}
        children={<MoonIcon />}
        variant="ghost"
        size="sm"
      />
      <IconButton
        aria-label="Light mode"
        display={displayLightModeToggle}
        onClick={toggleColorMode}
        children={<SunIcon />}
        variant="ghost"
        size="sm"
      />
    </Box>
  );
};

export default ColorModeToggle;
