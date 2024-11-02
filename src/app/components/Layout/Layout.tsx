import { Box, Flex, Link, Spinner } from "@chakra-ui/react";
import React from "react";
import { useNavigation } from "react-router-dom";
import NavBar from "../../components/NavBar/NavBar";
import links from "../../links";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FunctionComponent<LayoutProps> = ({ children, ..._rest }): React.ReactNode => {
  const navigation = useNavigation();
  return (
    <>
      <NavBar links={links} as="header" />
      <Flex
        display={navigation.state === "idle" ? "none" : "block"}
        direction="column"
        justifyContent="center"
        alignItems="center"
        textAlign="center"
        height="100vh"
        position="absolute"
      >
        <Spinner size="xl" />
      </Flex>
      <Box as="main" id="top">
        {children}
      </Box>
      <Flex as="footer" justify="center" fontSize="xs" mt="21">
        &copy;2021-{new Date().getFullYear()}
        <Link href="https://github.com/rylorin" ml="1">
          rylorin
        </Link>
      </Flex>
    </>
  );
};

export default Layout;
