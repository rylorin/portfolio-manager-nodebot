import { Box, Link, Spacer } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink } from "react-router-dom";
import PositionsTable from "./PositionsTable";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const PositionsIndex: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  return (
    <>
      <Box>
        <Spacer />
        <Link asChild>
          <RouterLink to={"../all"}>All</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to={"../options"}>Options</RouterLink>
        </Link>
        <Spacer />
      </Box>
      <PositionsTable />
    </>
  );
};

export default PositionsIndex;
