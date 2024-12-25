import { Badge, Box, Text, Tooltip } from "@chakra-ui/react";
import React from "react";
import { TradeStatus } from "../../../../models/trade.types";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import { tradeStatus2String } from "./utils";

interface Props {
  item: TradeEntry;
}

const statusBadgetColor = (status: TradeStatus): string => {
  switch (status) {
    case TradeStatus.open:
      return "teal";
    case TradeStatus.closed:
      return "pink";
    default:
      return "gray";
  }
};

const StatusBox = ({ item }: Props): React.ReactNode => {
  return (
    <Box display="flex" alignItems="baseline" mt={1} ml={2}>
      <Badge borderRadius="full" px="2" colorScheme={statusBadgetColor(item.status)} variant="outline">
        {tradeStatus2String(item.status)}
      </Badge>
      <Text fontWeight="semibold" textTransform="uppercase" ml="1">
        {formatNumber(item.duration)}
        {item.status == TradeStatus.open && item.expectedDuration != undefined && (
          <>/{formatNumber(item.expectedDuration)}</>
        )}
        &nbsp;days
      </Text>
      <Box color="gray.500" fontWeight="semibold" letterSpacing="wide" fontSize="xs" textTransform="uppercase" ml={1}>
        &bull;{" "}
        <Tooltip label={new Date(item.openingDate).toLocaleString()} hasArrow={true}>
          {new Date(item.openingDate).toLocaleDateString()}
        </Tooltip>
        {item.closingDate && (
          <>
            {" "}
            &bull;{" "}
            <Tooltip label={new Date(item.closingDate).toLocaleString()} hasArrow={true}>
              {new Date(item.closingDate).toLocaleDateString()}
            </Tooltip>
          </>
        )}
        {item.expectedExpiry && <> &bull; {new Date(item.expectedExpiry).toLocaleDateString()}</>}
      </Box>
    </Box>
  );
};

export default StatusBox;
