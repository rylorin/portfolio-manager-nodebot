import { LoaderFunctionArgs } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";

/**
 * Fetch a report
 * @param param0
 * @returns
 */
export const reportsIndexLoader0 = ({ params }: LoaderFunctionArgs): Promise<number[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/index`)
    .then((response) => response.json())
    .then((data) => data.reports as number[]);
};

/**
 * Fetch all reports
 * @param param0
 * @returns
 */
export const reportsIndexLoader = ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/summary/all`)
    .then((response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};

/**
 * Fetch a report
 * @param param0
 * @returns
 */
export const reportSummaryLoader = ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId, year } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/year/${year}`)
    .then((response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};
