import { ActionFunctionArgs, redirect } from "react-router-dom";

/**
 * Delete a setting
 * @param params
 * @returns
 */
export const settingSave = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, settingId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const data = Object.fromEntries(formData);
      console.log("data", data);
      if (settingId) {
        return fetch(`/api/portfolio/${portfolioId}/settings/${settingId}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      } else {
        return fetch(`/api/portfolio/${portfolioId}/settings/`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../"));
};

/**
 * Delete a setting
 * @param params
 * @returns
 */
export const settingDelete = async ({ request, params }: ActionFunctionArgs): Promise<Response> => {
  const { portfolioId, settingId } = params;
  return request
    .formData()
    .then(async (formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/settings/${settingId}/`, { method: "DELETE" });
    })
    .then(async (response: Response) => response.text())
    .then((_data) => redirect("../../"));
};
