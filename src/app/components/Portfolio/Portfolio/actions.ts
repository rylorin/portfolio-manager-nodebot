import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Delete a setting
 * @param params
 * @returns
 */
export const settingDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, itemId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/settings/${itemId}/`, { method: "DELETE" });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};
