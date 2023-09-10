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
const PositionsIndex: FunctionComponent<Props> = ({ ..._rest }): React.JSX.Element => {
  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../all"} as={RouterLink}>
          All
        </Link>
        {" | "}
        <Link to={"../options"} as={RouterLink}>
          Options
        </Link>
        <Spacer />
      </Box>
      <PositionsTable />
    </>
  );
};

export default PositionsIndex;
