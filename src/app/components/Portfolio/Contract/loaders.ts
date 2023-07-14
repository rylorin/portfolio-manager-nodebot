import { LoaderFunctionArgs } from "react-router-dom";
import { ContractEntry } from "../../../../routers/repository.types";

/**
 * Load Contract list content
 * @param params
 * @returns
 */
export const contractShowLoader = ({ params }: LoaderFunctionArgs): Promise<ContractEntry> => {
  const { portfolioId, contractId } = params;
  return fetch(`/api/portfolio/${portfolioId}/contract/id/${contractId}`)
    .then((response) => response.json())
    .then((data) => data.contract as ContractEntry);
};
