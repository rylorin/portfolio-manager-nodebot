import { Text } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { TradeStatus } from "../../../../models/trade.types";
import { ContractEntry } from "../../../../routers/contracts.types";
import PositionsTable from "../Position/PositionsTable";
import StatementsTable from "../Statement/StatementsTable";
import TradesTable from "../Trade/TradesTable";

type Props = { thisContract: ContractEntry };

/**
 * Statements list component
 * @param param
 * @returns
 */
const StockShow: FunctionComponent<Props> = ({ thisContract, ..._rest }): React.JSX.Element => {
  return (
    <>
      <Text>
        {thisContract.exchange}:{thisContract.symbol} - {thisContract.name}
      </Text>
      <PositionsTable content={thisContract.positions} />
      <TradesTable
        title="Open trades"
        content={thisContract.trades.filter((item) => item.status != TradeStatus.closed)}
      />
      <TradesTable
        title="Closed trades"
        content={thisContract.trades.filter((item) => item.status == TradeStatus.closed)}
      />
      <StatementsTable content={thisContract.statements} />
    </>
  );
};

export default StockShow;
