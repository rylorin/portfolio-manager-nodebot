import { Box, HStack, Link, Spacer, Text, VStack } from "@chakra-ui/react";
import { default as React } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { ReportEntry, TradesSummary } from "../../../../routers/reports.types";
import Number from "../../Number/Number";
import { StatementLink } from "../Statement/links";
import { formatMonth } from "./utils";

interface Props {
  theReports: ReportEntry[];
}

type PnlCallback = (ReportEntry) => number;

const PnLs: Record<string, PnlCallback> = {
  ["Stocks"]: (tradesSummary: TradesSummary) => tradesSummary.stocksPnLInBase,
  ["Equity Options"]: (tradesSummary: TradesSummary) => tradesSummary.optionsPnLInBase,
  ["Futures"]: (tradesSummary: TradesSummary) => tradesSummary.futuresPnLInBase,
  ["Futures Options"]: (tradesSummary: TradesSummary) => tradesSummary.fopPnlInBase,
  ["Bonds"]: (tradesSummary: TradesSummary) => tradesSummary.bondPnLInBase,
};

const _compareReports = (a: ReportEntry, b: ReportEntry): number => {
  let result = a.year - b.year;
  if (!result) result = a.month - b.month;
  return result;
};

const OneAssetTable = ({
  portfolioId,
  theReports,
  assetType,
  ..._rest
}: {
  portfolioId: string;
  theReports: ReportEntry[];
  assetType: string;
}): React.ReactNode => {
  let pnlTotal = 0;
  const addToTotal = (pnl: number): React.ReactNode => {
    pnlTotal += pnl;
    return <></>;
  };

  return (
    <>
      <VStack>
        {theReports
          .filter((report) => PnLs[assetType](report.tradesSummary))
          .map((report) => (
            <HStack key={`${report.year}-${report.month}-${assetType}`}>
              <Link asChild>
                <RouterLink to={StatementLink.toMonth(portfolioId, report.year, report.month)}>
                  <Text width="120px">{formatMonth(report.year, report.month)}</Text>
                </RouterLink>
              </Link>
              <Number value={PnLs[assetType](report.tradesSummary)} width="120px" />
              {addToTotal(PnLs[assetType](report.tradesSummary))}
            </HStack>
          ))}
        <HStack>
          <Text width="120px">Subtotal</Text>
          <Number value={pnlTotal} width="120px" />
        </HStack>
      </VStack>
    </>
  );
};

/**
 * Dividends table component
 * @param theReports Tax reports to summarize. Assume their summaries are sorted by date
 * @returns
 */
const PnL = ({ theReports, ..._rest }: Props): React.ReactNode => {
  const { portfolioId } = useParams();

  return (
    <>
      <VStack align="left">
        <HStack alignContent="left" borderBottom="1px" borderColor="gray.200">
          <Box width="120px">Underlying</Box>
          <Box width="120px">Month</Box>
          <Box width="120px" textAlign="right">
            P&L
          </Box>
          <Spacer />
        </HStack>
        {Object.keys(PnLs).map((assetType) => (
          <HStack alignContent="left" key={assetType} borderBottom="1px" borderColor="gray.200">
            <Box width="120px">{assetType}</Box>
            <OneAssetTable portfolioId={portfolioId} theReports={theReports} assetType={assetType} />
          </HStack>
        ))}
        <HStack>
          <Text width="120px">Total</Text>
          <Box width="120px"></Box>
          <Number value={theReports.reduce((p, report) => p + report.tradesSummary.totalPnL, 0)} width="120px" />
          <Spacer />
        </HStack>
      </VStack>
    </>
  );
};

export default PnL;
