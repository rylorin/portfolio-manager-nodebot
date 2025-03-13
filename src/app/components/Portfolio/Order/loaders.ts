import { LoaderFunctionArgs } from "react-router-dom";
import { OrderEntry } from "../../../../routers/";

/**
 * Load all positions
 * @param param0
 * @returns
 */
export const ordersIndexLoader = async ({ params }: LoaderFunctionArgs): Promise<OrderEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/orders/index`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.orders as OrderEntry[]);
};
