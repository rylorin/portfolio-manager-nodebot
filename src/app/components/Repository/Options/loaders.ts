import { LoaderFunctionArgs } from "react-router-dom";
import { OptionEntry } from "../../../../routers/repository.types";

/**
 * Load statement list content
 * @param params
 * @returns
 */
export const optionShowLoader = ({ params }: LoaderFunctionArgs): Promise<OptionEntry> => {
  const { optionId } = params;
  // console.log("tradesShowLoader", portfolioId, tradeId);
  return fetch(`/api/repository/options/${optionId}`)
    .then((response) => response.json())
    .then((data) => data.option as OptionEntry);
};
