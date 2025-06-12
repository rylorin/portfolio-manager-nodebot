import { Box, Flex, Link, Spinner, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { useNavigation } from "react-router-dom";
import links from "../../links";
import NavBar from "./NavBar";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: FunctionComponent<LayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const navigation = useNavigation();
  return (
    <VStack gap="1" margin={{ base: 0, md: 4 }}>
      <Flex
        display={navigation.state === "idle" ? "none" : "block"}
        justifyContent="center"
        alignItems="center"
        textAlign="center"
        height="100vh"
        width="100vw"
        position="fixed"
        top="0"
        left="0"
        bg="blue.200/70"
      >
        <Spinner size="xl" position="absolute" top="50%" left="50%" />
      </Flex>
      <NavBar links={links} as="header" />
      <Box as="main" id="top">
        {children}
      </Box>
      <Flex as="footer" justify="center" fontSize="xs" mt="21">
        &copy;2021-{new Date().getFullYear()}
        <Link href="https://github.com/rylorin" ml="1">
          rylorin
        </Link>
      </Flex>
    </VStack>
  );
};

export default Layout;
