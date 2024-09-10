import { LoaderFunctionArgs } from "react-router-dom";
import { StatementEntry, StatementsSynthesysEntries } from "../../../../routers/statements.types";

/**
 * Load year to date statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoaderYTD = async ({
  params,
}: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/ytd`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load last 12 months statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoader12M = async ({
  params,
}: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/12m`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load all statements summary
 * @param params
 * @returns
 */
export const statementSummaryLoaderAll = async ({
  params,
}: LoaderFunctionArgs): Promise<StatementsSynthesysEntries> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/summary/all`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.synthesysentries as StatementsSynthesysEntries);
};

/**
 * Load a single statement
 * @param params
 * @returns
 */
export const statementShowLoader = async ({ params }: LoaderFunctionArgs): Promise<StatementEntry> => {
  const { portfolioId, statementId } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/id/${statementId}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.statement as StatementEntry);
};

/**
 * Load statement list content
 * @param params
 * @returns
 */
export const statementMonthLoader = async ({ params }: LoaderFunctionArgs): Promise<StatementEntry[]> => {
  const { portfolioId, year, month } = params;
  return fetch(`/api/portfolio/${portfolioId}/statements/month/${year}/${month}`)
    .then(async (response) => response.json()) // eslint-disable-line @typescript-eslint/no-unsafe-return
    .then((data) => data.statemententries as StatementEntry[]);
};
