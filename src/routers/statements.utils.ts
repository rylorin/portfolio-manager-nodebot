import {
  BondStatement,
  Contract,
  ContractType,
  DividendStatement,
  EquityStatement,
  InterestStatement,
  OptionContract,
  OptionStatement,
  Portfolio,
  Statement,
  TaxStatement,
} from "../models";
import { StatementTypes } from "../models/statement.types";
import { DididendSummary, InterestsSummary, ReportEntry } from "./reports.types";
import { BaseStatement, StatementEntry, StatementOptionEntry } from "./statements.types";

export const statementModelToStatementEntry = (item: Statement): Promise<StatementEntry> => {
  const baseStatement: BaseStatement = {
    id: item.id,
    transactionId: item.transactionId,
    date: item.date.getTime(),
    currency: item.currency,
    amount: item.netCash,
    // pnl: undefined,
    fees: undefined,
    fxRateToBase: item.fxRateToBase,
    description: item.description,
    trade_id: item.trade_unit_id,
    underlying: item.stock,
    quantity: undefined,
  };
  switch (item.statementType) {
    case StatementTypes.EquityStatement:
      return EquityStatement.findByPk(item.id).then((thisStatement) => {
        baseStatement.quantity = thisStatement?.quantity;
        baseStatement.fees = thisStatement?.fees;
        return {
          statementType: StatementTypes.EquityStatement,
          ...baseStatement,
          pnl: thisStatement!.realizedPnL || 0,
        };
      });

    case StatementTypes.OptionStatement:
      return OptionStatement.findByPk(item.id, {
        include: [
          { model: Contract, as: "contract" },
          { model: OptionContract, as: "option" },
        ],
      }).then((thisStatement) => {
        baseStatement.quantity = thisStatement!.quantity;
        baseStatement.fees = thisStatement!.fees;
        const option: StatementOptionEntry = {
          id: thisStatement!.contract_id,
          secType: ContractType.Option,
          symbol: thisStatement!.contract.symbol,
          strike: thisStatement!.option.strike,
          lastTradeDate: thisStatement!.option.lastTradeDate,
          callOrPut: thisStatement!.option.callOrPut,
          multiplier: thisStatement!.option.multiplier,
          currency: item.currency,
          name: thisStatement!.contract.name,
          price: thisStatement!.contract.price,
        };
        return {
          statementType: StatementTypes.OptionStatement,
          ...baseStatement,
          option,
          pnl: thisStatement!.realizedPnL,
        };
      });

    case StatementTypes.DividendStatement:
      return DividendStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.DividendStatement,
          ...baseStatement,
          country: thisStatement!.country || "XY",
        };
      });

    case StatementTypes.TaxStatement:
      return TaxStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.TaxStatement,
          ...baseStatement,
          country: thisStatement!.country || "YY",
        };
      });

    case StatementTypes.InterestStatement:
      return InterestStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.InterestStatement,
          ...baseStatement,
          country: thisStatement!.country || "",
        };
      });

    case StatementTypes.WithHoldingStatement:
      return Promise.resolve({
        statementType: StatementTypes.WithHoldingStatement,
        ...baseStatement,
      });

    case StatementTypes.FeeStatement:
      baseStatement.fees = item.netCash;
      return Promise.resolve({
        statementType: StatementTypes.FeeStatement,
        ...baseStatement,
      });

    case StatementTypes.CorporateStatement:
      return Promise.resolve({
        statementType: StatementTypes.CorporateStatement,
        ...baseStatement,
      });

    case StatementTypes.CashStatement:
      return Promise.resolve({
        statementType: StatementTypes.CashStatement,
        ...baseStatement,
      });

    case StatementTypes.BondStatement:
      return BondStatement.findByPk(item.id).then((thisStatement) => {
        if (!thisStatement) throw Error(`BondStatement ${item.id} not found!`);
        let country: string;
        if (thisStatement!.country) country = thisStatement!.country;
        else if (item.stock.isin) country = item.stock.isin.substring(0, 2);
        else country = "ZZ";
        baseStatement.quantity = thisStatement!.quantity;
        baseStatement.fees = thisStatement!.fees;
        return {
          statementType: StatementTypes.BondStatement,
          ...baseStatement,
          country,
          accruedInterests: thisStatement!.accruedInterests,
          pnl: thisStatement!.realizedPnL,
        };
      });

    default:
      throw Error("Undefined statement type");
  }
};

/**
 * Transform Statement[] to sorted StatementEntry[]
 * @param statements
 * @returns
 */
export const prepareStatements = (statements: Statement[]): Promise<StatementEntry[]> => {
  return statements
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce(
      (p, item) =>
        p.then((statements) => {
          return statementModelToStatementEntry(item).then((statement_entry) => {
            statements.push(statement_entry);
            return statements;
          });
        }),
      Promise.resolve([] as StatementEntry[]),
    );
};

export const prepareReport = (portfolio: Portfolio): Promise<ReportEntry[]> => {
  return prepareStatements(portfolio.statements).then((statements) => {
    const result: ReportEntry[] = [];
    statements.forEach((statement) => {
      const year = new Date(statement.date).getUTCFullYear();
      const month = new Date(statement.date).getUTCMonth() + 1;
      let dividendEntry: DididendSummary | undefined;
      let interestEntry: InterestsSummary | undefined;
      let report = result.find((item) => item.year == year && item.month == month);
      if (!report) {
        // console.log(date, "creating report for ", year, month);
        report = {
          year,
          month,
          dividendsSummary: [],
          dividendsDetails: [],
          interestsSummary: [],
          interestsDetails: [],
          feesSummary: { totalAmountInBase: 0 },
          feesDetails: [],
          tradesSummary: { stocksPnLInBase: 0, optionsPnLInBase: 0, bondPnLInBase: 0, totalPnL: 0 },
          tradesDetails: [],
          otherDetails: [],
        };
        result.push(report);
      }
      switch (statement.statementType) {
        case StatementTypes.DividendStatement:
          dividendEntry = report.dividendsSummary.find((item) => item.country == statement.country);
          if (!dividendEntry) {
            dividendEntry = { country: statement.country, grossAmountInBase: 0, taxes: 0, netAmountInBase: 0 };
            report.dividendsSummary.push(dividendEntry);
          }
          dividendEntry.grossAmountInBase += statement.amount * statement.fxRateToBase;
          dividendEntry.netAmountInBase += statement.amount * statement.fxRateToBase;
          report.dividendsDetails.push(statement);
          break;

        case StatementTypes.TaxStatement:
          dividendEntry = report.dividendsSummary.find((item) => item.country == statement.country);
          if (!dividendEntry) {
            dividendEntry = { country: statement.country, grossAmountInBase: 0, taxes: 0, netAmountInBase: 0 };
            report.dividendsSummary.push(dividendEntry);
          }
          dividendEntry.taxes += statement.amount * statement.fxRateToBase;
          dividendEntry.netAmountInBase += statement.amount * statement.fxRateToBase;
          report.dividendsDetails.push(statement);
          break;

        case StatementTypes.InterestStatement:
          interestEntry = report.interestsSummary.find(
            (item) => item.country == (statement.country || portfolio.country),
          );
          if (!interestEntry) {
            interestEntry = {
              country: statement.country || portfolio.country,
              grossCredit: 0,
              netDebit: 0,
              withHolding: 0,
              netTotal: 0,
            };
            report.interestsSummary.push(interestEntry);
          }
          if (statement.amount > 0) interestEntry.grossCredit += statement.amount * statement.fxRateToBase;
          else interestEntry.netDebit += statement.amount * statement.fxRateToBase;
          interestEntry.netTotal += statement.amount * statement.fxRateToBase;
          report.interestsDetails.push(statement);
          break;

        case StatementTypes.WithHoldingStatement:
          interestEntry = report.interestsSummary.find((item) => item.country == portfolio.country);
          if (!interestEntry) {
            interestEntry = {
              country: portfolio.country,
              grossCredit: 0,
              netDebit: 0,
              withHolding: 0,
              netTotal: 0,
            };
            report.interestsSummary.push(interestEntry);
          }
          interestEntry.withHolding += statement.amount * statement.fxRateToBase;
          interestEntry.netTotal += statement.amount * statement.fxRateToBase;
          report.interestsDetails.push(statement);
          break;

        case StatementTypes.FeeStatement:
          report.feesSummary.totalAmountInBase += statement.amount * statement.fxRateToBase;
          report.feesDetails.push(statement);
          break;

        case StatementTypes.EquityStatement:
          report.tradesSummary.stocksPnLInBase += statement.pnl * statement.fxRateToBase;
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        case StatementTypes.OptionStatement:
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesSummary.optionsPnLInBase += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        case StatementTypes.BondStatement:
          // interest part
          interestEntry = report.interestsSummary.find(
            (item) => item.country == (statement.country || portfolio.country),
          );
          if (!interestEntry) {
            interestEntry = {
              country: statement.country || portfolio.country,
              grossCredit: 0,
              netDebit: 0,
              withHolding: 0,
              netTotal: 0,
            };
            report.interestsSummary.push(interestEntry);
          }
          if (statement.accruedInterests > 0)
            interestEntry.grossCredit += statement.accruedInterests * statement.fxRateToBase;
          else interestEntry.netDebit += statement.accruedInterests * statement.fxRateToBase;
          interestEntry.netTotal += statement.accruedInterests * statement.fxRateToBase;
          report.interestsDetails.push(statement);
          // PnL part
          report.tradesSummary.bondPnLInBase += statement.pnl * statement.fxRateToBase;
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        default:
          report.otherDetails.push(statement);
      }
    });
    // console.log(report.dividendsSummary);
    return result;
  });
};
