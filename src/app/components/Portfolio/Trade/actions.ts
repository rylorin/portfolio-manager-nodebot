import { ActionFunctionArgs, redirect } from "react-router-dom";
import { TradeLink } from "./links";

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
      // console.log("trade save ", data);
      return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}/SaveTrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Select values are returned as string (not all???!!!), therefore we have to convert them to numbers, if needed
        body: JSON.stringify({ ...data, strategy: parseInt(data.strategy as string) }),
      });
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Delete a trade
 * @param request
 * @param params
 * @returns
 */
export const tradeDelete = ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, tradeId } = params;
  // console.log("tradeDelete:", portfolioId, tradeId);
  return (
    request
      .formData()
      .then((_formData: Iterable<readonly [PropertyKey, any]>) => {
        return fetch(`/api/portfolio/${portfolioId}/trades/id/${tradeId}/DeleteTrade`, {
          method: "DELETE",
        });
      })
      .then((response: Response) => response.text())
      // .then((data) => console.log("tradeDelete done:", data))
      .then(() => redirect(TradeLink.toIndex(portfolioId)))
  );
};
