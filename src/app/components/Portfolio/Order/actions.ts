import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Delete an open order
 * @param params
 * @returns
 */
export const orderDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, orderId } = params;
  return request
    .formData()
    .then(async (_formData: Iterable<readonly [PropertyKey, any]>) => {
      return fetch(`/api/portfolio/${portfolioId}/orders/${orderId}/DeleteOrder`, {
        method: "DELETE",
      });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};
