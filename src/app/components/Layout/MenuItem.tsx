import { Link, Text } from "@chakra-ui/react";
import React, { FunctionComponent, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";

interface MenuItemProps {
  to: string;
  children: ReactNode;
}

const MenuItem: FunctionComponent<MenuItemProps> = ({ children, to = "/", ...rest }): React.ReactNode => {
  return (
    <Link asChild>
      <RouterLink to={to}>
        <Text display="block" {...rest}>
          {children}
        </Text>
      </RouterLink>
    </Link>
  );
};
export default MenuItem;
