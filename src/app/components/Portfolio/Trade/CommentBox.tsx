import { Text } from "@chakra-ui/react";
import React from "react";
import { TradeEntry } from "../../../../routers/trades.types";

type Props = {
  item: TradeEntry;
};

const CommentBox = ({ item }: Props): React.ReactNode => {
  return (
    <>
      {item.comment?.length > 0 && (
        <Text color="gray.500" fontWeight="semibold" mt={1} ml={2}>
          {item.comment}
        </Text>
      )}
    </>
  );
};

export default CommentBox;
