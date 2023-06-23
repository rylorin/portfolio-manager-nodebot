import { Box, Flex, Link } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import NavBar from "../../components/NavBar/NavBar";
import links from "../../links";

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: FunctionComponent<LayoutProps> = ({ children, ...rest }): JSX.Element => {
  return (
    <>
      <NavBar links={links} as="header" />
      <Box as="main">{children}</Box>
      <Flex as="footer" justify="center" fontSize="xs" mt="21">
        ©️2023
        <Link href="https://github.com/rylorin" ml="1">
          rylorin
        </Link>
      </Flex>
    </>
  );
};

export default Layout;
