import { LoaderFunctionArgs } from "react-router-dom";
import { OptionContractEntry } from "../../../../routers/";

/**
 * Load statement list content
 * @param params
 * @returns
 */
export const optionShowLoader = async ({ params }: LoaderFunctionArgs): Promise<OptionContractEntry> => {
  const { optionId } = params;
  // console.log("tradesShowLoader", portfolioId, tradeId);
  return fetch(`/api/repository/options/${optionId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.option as OptionContractEntry);
};
