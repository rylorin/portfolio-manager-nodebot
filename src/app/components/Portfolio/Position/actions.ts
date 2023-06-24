import { redirect } from "react-router-dom";

/**
 * Delete a position
 * @param param0
 * @returns
 */
export const positionDelete = ({ request, params }): any => {
  const { portfolioId, positionId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/positions/id/${positionId}/DeletePosition`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};
