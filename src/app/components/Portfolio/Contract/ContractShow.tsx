// import { SecType } from "@stoqey/ib";
import { FunctionComponent, default as React } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { ContractEntry } from "../../../../routers/contracts.types";
import StockShow from "./StockShow";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param
 * @returns
 */
const ContractShow: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const { _portfolioId } = useParams();
  const thisContract = useLoaderData() as ContractEntry;

  switch (thisContract.secType) {
    case ContractType.Stock:
    case ContractType.Future:
      return <StockShow thisContract={thisContract} />;
    default:
      return <></>;
  }
};

export default ContractShow;
