import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Delete a setting
 * @param params
 * @returns
 */
export const portfolioSave = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};
