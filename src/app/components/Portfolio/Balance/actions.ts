import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Save a balance
 * @param request
 * @param params
 * @returns
 */
export const balanceSave = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, balanceId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      // console.log("balance save ", data);
      return fetch(`/api/portfolio/${portfolioId}/balances/id/${balanceId}/SaveBalance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Select values are returned as string (not all???!!!), therefore we have to convert them to numbers, if needed
        body: JSON.stringify({ ...data, strategy: parseInt(data.strategy as string) }),
      });
    })
    .then(async (response: Response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((_data) => redirect("../"));
};

/**
 * Delete a position
 * @param params
 * @returns
 */
export const balanceDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, balanceId } = params;
  return request
    .formData()
    .then(async (_formData: Iterable<readonly [PropertyKey, any]>) => {
      return fetch(`/api/portfolio/${portfolioId}/balances/id/${balanceId}/DeleteBalance`, {
        method: "DELETE",
      });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};
