import {
  BondStatement,
  Contract,
  DividendStatement,
  EquityStatement,
  InterestStatement,
  OptionContract,
  OptionStatement,
  Portfolio,
  Statement,
  TaxStatement,
} from "../models";
import { CorporateStatement } from "../models/corpo_statement.model";
import { ContractType, StatementTypes } from "../models/types";
import { DididendSummary, InterestsSummary, ReportEntry } from "./reports.types";
import { BaseStatement, StatementEntry, StatementUnderlyingOption } from "./statements.types";

export const statementModelToStatementEntry = async (item: Statement): Promise<StatementEntry> => {
  const baseStatement: BaseStatement = {
    id: item.id,
    transactionId: item.transactionId,
    date: item.date.getTime(),
    // statementType: item.statementType,
    currency: item.currency,
    amount: item.netCash,
    fxRateToBase: item.fxRateToBase,
    description: item.description,
    trade_id: item.trade_unit_id,
    underlying: item.stock,
  };
  switch (item.statementType) {
    case StatementTypes.EquityStatement:
      return EquityStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.EquityStatement,
          ...baseStatement,
          underlying: item.stock,
          quantity: thisStatement!.quantity,
          pnl: thisStatement!.realizedPnL,
          fees: thisStatement!.fees,
        };
      });

    case StatementTypes.OptionStatement:
      return OptionStatement.findByPk(item.id, {
        include: [
          { model: Contract, as: "contract" },
          { model: OptionContract, as: "option" /*, include: [{ model: Contract, as: "underlying" }] */ },
        ],
      }).then((thisStatement) => {
        const option: StatementUnderlyingOption = {
          ...thisStatement!.contract,
          ...thisStatement!.option,
          // id: thisStatement!.option.id,
          // secType: thisStatement!.contract.secType,
          // symbol: thisStatement!.contract.symbol,
          // currency: item.currency,
          // name: thisStatement!.contract.name,
          // price: thisStatement!.contract.price,
          // strike: thisStatement!.option.strike,
          // lastTradeDate: thisStatement!.option.lastTradeDate,
          // callOrPut: thisStatement!.option.callOrPut,
          // multiplier: thisStatement!.option.multiplier,
        };
        return {
          statementType: StatementTypes.OptionStatement,
          ...baseStatement,
          underlying: item.stock,
          option,
          quantity: thisStatement!.quantity,
          pnl: thisStatement!.realizedPnL,
          fees: thisStatement!.fees,
        };
      });

    case StatementTypes.DividendStatement:
      return DividendStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.DividendStatement,
          ...baseStatement,
          country: thisStatement!.country || "XY",
          underlying: item.stock,
          pnl: item.netCash,
        };
      });

    case StatementTypes.TaxStatement:
      return TaxStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.TaxStatement,
          ...baseStatement,
          country: thisStatement!.country || "YY",
          underlying: item.stock,
          pnl: item.netCash,
        };
      });

    case StatementTypes.InterestStatement:
      return InterestStatement.findByPk(item.id).then((thisStatement) => {
        return {
          statementType: StatementTypes.InterestStatement,
          ...baseStatement,
          pnl: item.netCash,
          country: thisStatement!.country || "",
          underlying: item.stock,
        };
      });

    case StatementTypes.WithHoldingStatement:
      return Promise.resolve({
        statementType: StatementTypes.WithHoldingStatement,
        ...baseStatement,
      });

    case StatementTypes.FeeStatement:
      // baseStatement.fees = item.netCash;
      return Promise.resolve({
        statementType: StatementTypes.FeeStatement,
        ...baseStatement,
        pnl: item.netCash,
        fees: item.netCash,
      });

    case StatementTypes.CorporateStatement:
      return CorporateStatement.findByPk(item.id).then((thisStatement) => {
        if (!thisStatement) throw Error(`CorporateStatement ${item.id} not found!`);
        return {
          statementType: StatementTypes.CorporateStatement,
          ...baseStatement,
          underlying: item.stock,
          quantity: thisStatement?.quantity || 0,
          pnl: thisStatement?.pnl || 0,
        };
      });

    case StatementTypes.CashStatement:
      return {
        statementType: StatementTypes.CashStatement,
        ...baseStatement,
      };

    case StatementTypes.BondStatement:
      return BondStatement.findByPk(item.id).then((thisStatement) => {
        if (!thisStatement) throw Error(`BondStatement ${item.id} not found!`);
        let country: string;
        if (thisStatement.country) country = thisStatement.country;
        else if (item.stock?.isin) country = item.stock.isin.substring(0, 2);
        else country = "ZZ";
        return {
          statementType: StatementTypes.BondStatement,
          ...baseStatement,
          country,
          underlying: item.stock,
          quantity: thisStatement.quantity,
          pnl: thisStatement.realizedPnL,
          fees: thisStatement.fees,
        };
      });

    case StatementTypes.SalesTaxStatement:
      return {
        statementType: StatementTypes.SalesTaxStatement,
        ...baseStatement,
      };

    case StatementTypes.PriceAdjustments:
      return {
        statementType: StatementTypes.PriceAdjustments,
        ...baseStatement,
      };

    default:
      throw Error("Undefined statement type");
  }
};

/**
 * Transform Statement[] to sorted StatementEntry[]
 * @param statements
 * @returns
 */
export const prepareStatements = async (statements: Statement[]): Promise<StatementEntry[]> => {
  return statements
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce(
      async (p, item) =>
        p.then(async (statements) => {
          return statementModelToStatementEntry(item).then((statement_entry) => {
            statements.push(statement_entry);
            return statements;
          });
        }),
      Promise.resolve([] as StatementEntry[]),
    );
};

export const prepareReport = async (portfolio: Portfolio): Promise<ReportEntry[]> => {
  return prepareStatements(portfolio.statements).then((statements) => {
    const result: ReportEntry[] = [];
    statements.forEach((statement) => {
      const year = new Date(statement.date).getUTCFullYear();
      const month = new Date(statement.date).getUTCMonth() + 1;
      let dividendEntry: DididendSummary | undefined;
      let interestEntry: InterestsSummary | undefined;
      let report = result.find((item) => item.year == year && item.month == month);
      if (!report) {
        report = {
          year,
          month,
          dividendsSummary: [],
          dividendsDetails: [],
          interestsSummary: [],
          interestsDetails: [],
          feesSummary: { totalAmountInBase: 0 },
          feesDetails: [],
          tradesSummary: {
            stocksPnLInBase: 0,
            optionsPnLInBase: 0,
            futuresPnLInBase: 0,
            fopPnlInBase: 0,
            bondPnLInBase: 0,
            totalPnL: 0,
          },
          tradesDetails: [],
          otherDetails: [],
        };
        result.push(report);
      }
      switch (statement.statementType) {
        case StatementTypes.DividendStatement:
        case StatementTypes.TaxStatement:
          dividendEntry = report.dividendsSummary.find((item) => item.country == statement.country);
          if (!dividendEntry) {
            dividendEntry = { country: statement.country, grossAmountInBase: 0, taxes: 0, netAmountInBase: 0 };
            report.dividendsSummary.push(dividendEntry);
          }
          if (statement.statementType == StatementTypes.DividendStatement)
            dividendEntry.grossAmountInBase += statement.amount * statement.fxRateToBase;
          else if (statement.statementType == StatementTypes.TaxStatement)
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
          switch (statement.underlying.secType) {
            case ContractType.Stock:
              report.tradesSummary.stocksPnLInBase += statement.pnl * statement.fxRateToBase;
              break;
            case ContractType.Future:
              report.tradesSummary.futuresPnLInBase += statement.pnl * statement.fxRateToBase;
              break;
          }
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        case StatementTypes.OptionStatement:
          if (
            statement.option.secType == ContractType.FutureOption ||
            statement.underlying?.secType == ContractType.Future
          )
            report.tradesSummary.fopPnlInBase += statement.pnl * statement.fxRateToBase;
          else report.tradesSummary.optionsPnLInBase += statement.pnl * statement.fxRateToBase;
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        case StatementTypes.BondStatement:
          report.tradesSummary.bondPnLInBase += statement.pnl * statement.fxRateToBase;
          report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          report.tradesDetails.push(statement);
          break;

        case StatementTypes.CorporateStatement:
          if (statement.pnl) {
            switch (statement.underlying.secType) {
              case ContractType.Bond:
                report.tradesSummary.bondPnLInBase += statement.pnl * statement.fxRateToBase;
                report.tradesDetails.push(statement);
            }
            report.tradesSummary.totalPnL += statement.pnl * statement.fxRateToBase;
          } else report.otherDetails.push(statement);
          break;

        default:
          report.otherDetails.push(statement);
      }
    });
    // console.log(report.dividendsSummary);
    return result;
  });
};
