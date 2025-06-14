import { Flex, Stack } from "@chakra-ui/react";
import React, { FunctionComponent, ReactNode } from "react";
import MenuItem from "../../Layout/MenuItem";

interface MenuLinksProps {
  links: Record<string, string>;
}

const MenuLinks: FunctionComponent<MenuLinksProps> = ({ links }): React.ReactNode => {
  return (
    <Stack
      as="nav"
      alignItems={{ base: "center", md: "left" }}
      justify={{ base: "center", md: "left" }}
      direction={{ base: "column", md: "row" }}
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

interface SideBarContainerProps {
  children: ReactNode;
}

const SideBarContainer: FunctionComponent<SideBarContainerProps> = ({ children, ...rest }): React.ReactNode => {
  return (
    <Flex
      direction={{ base: "row", lg: "column" }}
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

interface SideBarProps {
  links: Record<string, string>;
  border?: string;
  children: ReactNode;
}

const SideBar: FunctionComponent<SideBarProps> = ({ links, children, ...rest }): React.ReactNode => {
  // console.log(links);
  return (
    <SideBarContainer {...rest}>
      <MenuLinks links={links} />
      {children}
    </SideBarContainer>
  );
};

export default SideBar;
