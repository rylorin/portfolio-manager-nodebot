import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Save a trade
 * @param request
 * @param params
 * @returns
 */
export const tradeSave = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, tradeId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      console.log("tradeSave:", data);
      return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}/SaveTrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};
