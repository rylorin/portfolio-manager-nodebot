import { LoaderFunctionArgs } from "react-router-dom";
import { StatementEntry, StatementsSynthesysEntries } from "../../../../routers/statements.types";

/**
 * Load year to date statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoaderYTD = ({ params }: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/ytd`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load last 12 months statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoader12M = ({ params }: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/12m`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load all statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoaderAll = ({ params }: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/all`)
    .then((response) => response.json())
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load a single statement
 * @param params
 * @returns
 */
export const statementShowLoader = ({ params }: LoaderFunctionArgs): Promise<StatementEntry> => {
  const { portfolioId, statementId } = params;
  // console.log("statement show", portfolioId, statementId);
  return fetch(`/api/portfolio/${portfolioId}/statements/id/${statementId}`)
    .then((response) => response.json())
    .then((data) => data.statement as StatementEntry);
};

/**
 * Load statement list content
 * @param params
 * @returns
 */
export const statementMonthLoader = ({ params }: LoaderFunctionArgs): Promise<StatementEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/month/${year}/${month}`)
    .then((response) => response.json())
    .then((data) => data.statemententries as StatementEntry[]);
};
