import { LoaderFunctionArgs } from "react-router-dom";
import { ContractEntry } from "../../../../routers/";

/**
 * Load Contract list content
 * @param params
 * @returns
 */
export const contractShowLoader = async ({ params }: LoaderFunctionArgs): Promise<ContractEntry> => {
  const { portfolioId, contractId } = params;
  return fetch(`/api/portfolio/${portfolioId}/contracts/id/${contractId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.contract as ContractEntry);
};
