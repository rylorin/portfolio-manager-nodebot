import { CloseIcon, HamburgerIcon } from "@chakra-ui/icons";
import { Box, Flex, IconButton, Link, Spacer, Stack, Text } from "@chakra-ui/react";
import React, { FunctionComponent, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import logo from "../../logo.svg";
import ColorModeToggle from "../ColorModeToggle/ColorModeToggle";
import SpinningLogo from "../SpinningLogo/SpinningLogo";

type NavBarProps = {
  links: Record<string, string>;
  as: string;
};

const NavBar: FunctionComponent<NavBarProps> = ({ links, ...rest }): JSX.Element => {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggle = () => setIsOpen(!isOpen);
  const to = Object.keys(links).shift() || "/";

  return (
    <NavBarContainer {...rest}>
      <RouterLink to={to}>
        <SpinningLogo w="40px" h="40px" src={logo} />
      </RouterLink>
      <Spacer />
      <ColorModeToggle mr="2" hideFrom="md" />
      <MenuToggle toggle={toggle} isOpen={isOpen} />
      <MenuLinks links={links} isOpen={isOpen} />
      <ColorModeToggle ml="2" hideBelow="md" />
    </NavBarContainer>
  );
};

type MenuToggleProps = { isOpen: boolean; toggle: () => void };

const MenuToggle: FunctionComponent<MenuToggleProps> = ({ toggle, isOpen }): JSX.Element => {
  return (
    <Box display={{ base: "block", md: "none" }} onClick={toggle}>
      {isOpen ? (
        <IconButton aria-label="Close nav menu" icon={<CloseIcon />} />
      ) : (
        <IconButton aria-label="Open nav menu" icon={<HamburgerIcon />} />
      )}
    </Box>
  );
};

type MenuItemProps = { to: string; children: ReactNode };

const MenuItem: FunctionComponent<MenuItemProps> = ({ children, to = "/", ...rest }): JSX.Element => {
  return (
    <Link to={to} as={RouterLink}>
      <Text display="block" {...rest}>
        {children}
      </Text>
    </Link>
  );
};

type MenuLinksProps = {
  links: Record<string, string>;
  isOpen: boolean;
};

const MenuLinks: FunctionComponent<MenuLinksProps> = ({ links, isOpen }): JSX.Element => {
  return (
    <Box display={{ base: isOpen ? "block" : "none", md: "block" }} flexBasis={{ base: "100%", md: "auto" }}>
      <Stack
        spacing="4"
        align="center"
        justify={["center", "space-between", "flex-end", "flex-end"]}
        direction={["column", "row", "row", "row"]}
        pt={[4, 4, 0, 0]}
      >
        {Object.entries(links).map(([K, V]) => (
          <MenuItem key={K} to={K}>
            {V}
          </MenuItem>
        ))}
      </Stack>
    </Box>
  );
};

type NavBarContainerProps = {
  children: ReactNode;
};

const NavBarContainer: FunctionComponent<NavBarContainerProps> = ({ children, ...rest }): JSX.Element => {
  return (
    <Flex as="nav" align="center" justify="space-between" wrap="wrap" w="100%" pr="4" pl="4" pt="1" pb="1" {...rest}>
      {children}
    </Flex>
  );
};

export default NavBar;
