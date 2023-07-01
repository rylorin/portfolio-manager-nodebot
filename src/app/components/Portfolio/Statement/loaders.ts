import { Statement } from "../../../../models";
import { StatementEntry, StatementsSynthesysEntries } from "../../../../routers/statements.types";

/**
 * Load year to date statements summary
 * @param param0
 * @returns
 */
export const statementSummaryLoaderYTD = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/ytd`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries);
};

/**
 * Load last 12 months statements summary
 * @param param0
 * @returns
 */
export const statementSummaryLoader12M = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/12m`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries);
};

/**
 * Load all statements summary
 * @param param0
 * @returns
 */
export const statementSummaryLoaderAll = ({ params }): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/all`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries);
};

/**
 * Load statement list content
 * @param param0
 * @returns
 */
export const statementShowLoader = ({ params }): Promise<Statement> => {
  const { portfolioId, statementId } = params;
  // console.log("statement show", portfolioId, statementId);
  return fetch(`/api/portfolio/${portfolioId}/statements/id/${statementId}`)
    .then((response) => response.json())
    .then((data) => data.statement);
};

/**
 * Load statement list content
 * @param param0
 * @returns
 */
export const statementMonthLoader = ({ params }): Promise<StatementEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/month/${year}/${month}`)
    .then((response) => response.json())
    .then((data) => data.statemententries);
};
