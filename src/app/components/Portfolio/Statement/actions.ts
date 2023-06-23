import { redirect } from "react-router-dom";

/**
 * Create a new trade using current statement
 * @param param0
 * @returns
 */
export const statementCreateTrade = ({ request, params }) => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/CreateTrade`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Guess trade of current statement
 * @param param0
 * @returns
 */
export const statementGuessTrade = ({ request, params }) => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/GuessTrade`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Unlink current statement from trade
 * @param param0
 * @returns
 */
export const statementUnlinkTrade = ({ request, params }) => {
  const { portfolioId, statementId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/UnlinkTrade`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Add current statement to given trade
 * @param param0
 * @returns
 */
export const statementAddToTrade = ({ request, params }) => {
  const { portfolioId, statementId, tradeId } = params;
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/AddToTrade/${tradeId}`);
    })
    .then((response: Response) => response.json())
    .then((_data) => redirect("../"));
};

/**
 * Delete a statement
 * @param param0
 * @returns
 */
export const statementDelete = ({ request, params }) => {
  const { portfolioId, statementId } = params;
  // console.log("statementDelete", portfolioId, statementId);
  return request
    .formData()
    .then((formData: Iterable<readonly [PropertyKey, any]>) => {
      const _data = Object.fromEntries(formData);
      return fetch(`/api/portfolio/${portfolioId}/statements/${statementId}/DeleteStatement`);
    })
    .then((response: Response) => response.text())
    .then((_data) => redirect("../"));
};
