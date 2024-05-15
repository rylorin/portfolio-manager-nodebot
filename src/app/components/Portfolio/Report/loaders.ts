import { LoaderFunctionArgs } from "react-router-dom";
import { ReportEntry } from "../../../../routers/reports.types";

/**
 * Fetch all reports
 * @param param0
 * @returns
 */
export const reportsIndexLoader = async ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/summary/all`)
    .then(async (response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};

export const reportsIndexLoader12m = async ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/summary/12m`)
    .then(async (response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};

export const reportsIndexLoaderYtd = async ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/summary/ytd`)
    .then(async (response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};
/**
 * Fetch a report
 * @param param0
 * @returns
 */
export const reportSummaryLoader = async ({ params }: LoaderFunctionArgs): Promise<ReportEntry[]> => {
  const { portfolioId, year } = params;
  return fetch(`/api/portfolio/${portfolioId}/reports/year/${year}`)
    .then(async (response) => response.json())
    .then((data) => data.reports as ReportEntry[]);
};
