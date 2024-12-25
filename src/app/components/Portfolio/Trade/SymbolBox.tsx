import { Badge, Box, Link } from "@chakra-ui/react";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeEntry } from "../../../../routers/trades.types";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { tradeStrategy2String } from "./utils";

interface Props {
  item: TradeEntry;
}

const SymbolBox = ({ item }: Props): React.ReactNode => {
  return (
    <Box display="flex" alignItems="baseline" mt={1} ml={2}>
      <Badge borderRadius="full" px="2" colorScheme="teal">
        <Link to={ContractLink.toItem(item.portfolioId, item.underlying.id)} as={RouterLink}>
          {item.underlying.symbol}
        </Link>
      </Badge>
      <Box fontWeight="semibold" letterSpacing="wide" fontSize="xs" textTransform="uppercase" ml={1} color="gray.500">
        {item.currency} &bull; {tradeStrategy2String(item.strategy)}
      </Box>
      {item.risk && (
        <Box fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">
          {" • Risk "}
          <Number value={item.risk} />
        </Box>
      )}
    </Box>
  );
};

export default SymbolBox;
