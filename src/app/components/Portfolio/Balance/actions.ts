import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Delete a position
 * @param params
 * @returns
 */
export const balanceDelete = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, balanceId } = params;
  return request
    .formData()
    .then((_formData: Iterable<readonly [PropertyKey, any]>) => {
      return fetch(`/api/portfolio/${portfolioId}/balances/id/${balanceId}/DeleteBalance`, {
        method: "DELETE",
      });
    })
    .then((response: Response) => response.text())
    .then((_data) => redirect("../"));
};
