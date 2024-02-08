import { Box, Text } from "@chakra-ui/react";
import React from "react";
import { TradeEntry } from "../../../../routers/trades.types";
import Number from "../../Number/Number";

type Props = {
  item: TradeEntry;
};

const PerformanceBox = ({ item }: Props): React.ReactNode => {
  return (
    <Box display="flex" alignItems="baseline" mt={1} ml={2}>
      <Text fontWeight="semibold" textTransform="uppercase">
        P&L: <Number value={item.pnl} />
      </Text>
      <Text color="gray.500" fontSize="xs">
        &nbsp;Realized +&nbsp;
      </Text>
      <Box fontWeight="semibold">
        <Number value={item.unrlzdPnl} />
      </Box>
      <Text color="gray.500" fontSize="xs">
        &nbsp;Unrealized =&nbsp;
      </Text>
      <Box fontWeight="semibold">
        <Number value={item.pnl + item.unrlzdPnl} /> (<Number value={item.apy} isPercent />)
      </Box>
    </Box>
  );
};

export default PerformanceBox;
