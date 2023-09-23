import { Flex, Link, Stack, Text } from "@chakra-ui/react";
import React, { FunctionComponent, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

type SideBarProps = {
  links: Record<string, string>;
  border?: string;
};

const SideBar: FunctionComponent<SideBarProps> = ({ links, ...rest }): React.ReactNode => {
  // console.log(links);
  return (
    <SideBarContainer {...rest}>
      <MenuLinks links={links} />
    </SideBarContainer>
  );
};

type MenuItemProps = { to: string; children: ReactNode };

const MenuItem: FunctionComponent<MenuItemProps> = ({ children, to = "/", ...rest }): React.ReactNode => {
  return (
    <Link to={to} as={RouterLink} w={{ xl: "100%" }}>
      <Text display="block" {...rest}>
        {children}
      </Text>
    </Link>
  );
};

type MenuLinksProps = {
  links: Record<string, string>;
};

const MenuLinks: FunctionComponent<MenuLinksProps> = ({ links }): React.ReactNode => {
  return (
    <Stack
      spacing="4"
      alignItems={["center", "center", "center", "left", "left"]}
      justify={["center", "center", "space-between", "space-between", "flex-start"]}
      direction={{ base: "column", lg: "row", xl: "column" }}
      //  pt={[4, 4, 0, 0]}
      flexWrap="wrap"
    >
      {Object.entries(links).map(([K, V]) => (
        <MenuItem key={K} to={K}>
          {V}
        </MenuItem>
      ))}
    </Stack>
  );
};

type SideBarContainerProps = {
  children: ReactNode;
};

const SideBarContainer: FunctionComponent<SideBarContainerProps> = ({ children, ...rest }): React.ReactNode => {
  return (
    <Flex
      as="nav"
      justify="space-between"
      wrap="wrap"
      //   w="100%"
      pr="4"
      pl="4"
      pt="1"
      pb="1"
      //   flexBasis="100%"
      {...rest}
    >
      {children}
    </Flex>
  );
};

export default SideBar;
