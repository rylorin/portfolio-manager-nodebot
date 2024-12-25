import { Box, Link, Text } from "@chakra-ui/react";
import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { TradeEntry } from "../../../../routers/trades.types";
import { TradeLink } from "./links";

interface Props {
  item: TradeEntry;
}

const TitleBox = ({ item }: Props): React.ReactNode => {
  if (item.id > 0)
    return (
      <Box display="flex" alignItems="baseline" mt={1}>
        <Link to={TradeLink.toItem(item.portfolioId, item.id)} as={RouterLink} alignItems="baseline">
          <Text alignItems="baseline">Trade #{item.id}</Text>
        </Link>
      </Box>
    );
  else return <Text>Orphan positions #{item.id}</Text>;
};

export default TitleBox;
