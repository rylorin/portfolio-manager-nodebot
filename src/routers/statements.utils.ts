import {
  BondStatement,
  Contract,
  ContractType,
  DividendStatement,
  EquityStatement,
  OptionContract,
  OptionStatement,
  Portfolio,
  Statement,
  TaxStatement,
} from "../models";
import { StatementTypes } from "../models/statement.types";
import { DididendSummary, ReportEntry } from "./reports.types";
import { BaseStatement, StatementEntry, StatementOptionEntry } from "./statements.types";

export const statementModelToStatementEntry = (item: Statement): Promise<StatementEntry> => {
  const baseStatement: BaseStatement = {
    id: item.id,
    transactionId: item.transactionId,
    date: item.date.getTime(),
    // statementType: item.statementType,
    currency: item.currency,
    amount: item.netCash,
    pnl: undefined,
    fees: undefined,
    fxRateToBase: item.fxRateToBase,
    description: item.description,
    trade_id: item.trade_unit_id,
    underlying: item.stock,
    quantity: undefined,
    // option: undefined,
  };
  switch (item.statementType) {
    case StatementTypes.EquityStatement:
      return EquityStatement.findByPk(item.id).then((thisStatement) => {
        baseStatement.quantity = thisStatement?.quantity;
        baseStatement.pnl = thisStatement?.realizedPnL;
        baseStatement.fees = thisStatement?.fees;
        return {
          statementType: StatementTypes.EquityStatement,
          ...baseStatement,
        };
      });
    case StatementTypes.OptionStatement:
      return OptionStatement.findByPk(item.id, {
        include: [
          { model: Contract, as: "contract" },
          { model: OptionContract, as: "option" },
        ],
      }).then((thisStatement) => {
        if (thisStatement) {
          baseStatement.quantity = thisStatement.quantity;
          baseStatement.pnl = thisStatement.realizedPnL;
          baseStatement.fees = thisStatement.fees;
          const option: StatementOptionEntry = {
            id: thisStatement.contract_id,
            secType: ContractType.Option,
            symbol: thisStatement.contract.symbol,
            strike: thisStatement.option.strike,
            lastTradeDate: thisStatement.option.lastTradeDate,
            callOrPut: thisStatement.option.callOrPut,
            multiplier: thisStatement.option.multiplier,
            currency: item.currency,
            name: thisStatement.contract.name,
            price: thisStatement.contract.price,
          };
          return {
            statementType: StatementTypes.OptionStatement,
            ...baseStatement,
            option,
          };
        } else return baseStatement as StatementEntry;
      });

    case StatementTypes.DividendStatement:
      return DividendStatement.findByPk(item.id).then((thisStatement) => {
        baseStatement.pnl = item.netCash;
        return {
          statementType: StatementTypes.DividendStatement,
          ...baseStatement,
          country: thisStatement!.country,
        };
      });

    case StatementTypes.TaxStatement:
      return TaxStatement.findByPk(item.id).then((thisStatement) => {
        baseStatement.pnl = item.netCash;
        return {
          statementType: StatementTypes.TaxStatement,
          ...baseStatement,
          country: thisStatement!.country,
        };
      });

    case StatementTypes.InterestStatement:
      baseStatement.pnl = item.netCash;
      return Promise.resolve({
        statementType: StatementTypes.InterestStatement,
        ...baseStatement,
      });
    case StatementTypes.WithHoldingStatement:
      baseStatement.pnl = item.netCash;
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
        baseStatement.quantity = thisStatement?.quantity;
        baseStatement.fees = thisStatement?.fees;
        baseStatement.pnl = thisStatement?.accruedInterests;
        return {
          statementType: StatementTypes.BondStatement,
          ...baseStatement,
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

export const prepareReport = (portfolio: Portfolio, year: number, month: number): Promise<ReportEntry> => {
  return prepareStatements(portfolio.statements).then((statements) => {
    const report: ReportEntry = {
      portfolioId: portfolio.id,
      year,
      month,
      dividendsSummary: [],
      dividendsDetails: [],
      interestsSummary: { totalAmountInBase: 0, grossCredit: 0, netDebit: 0, withHolding: 0 },
      interestsDetails: [],
    };
    statements.forEach((statement) => {
      //   const date = statement.date.toString();
      //   const year = parseInt(date.substring(0, 4));
      //   const month = parseInt(date.substring(5, 7));
      let entry: DididendSummary | undefined;
      switch (statement.statementType) {
        case StatementTypes.DividendStatement:
          entry = report.dividendsSummary.find((item) => item.country == statement.country);
          if (!entry) {
            entry = { country: statement.country, grossAmountInBase: 0, taxes: 0 };
            report.dividendsSummary.push(entry);
          }
          entry.grossAmountInBase += statement.amount * statement.fxRateToBase;
          report.dividendsDetails.push(statement);
          break;

        case StatementTypes.TaxStatement:
          entry = report.dividendsSummary.find((item) => item.country == statement.country);
          if (!entry) {
            entry = { country: statement.country, grossAmountInBase: 0, taxes: 0 };
            report.dividendsSummary.push(entry);
          }
          entry.taxes += statement.amount * statement.fxRateToBase;
          report.dividendsDetails.push(statement);
          break;

        case StatementTypes.InterestStatement:
          report.interestsSummary.totalAmountInBase += statement.amount * statement.fxRateToBase;
          if (statement.amount > 0) report.interestsSummary.grossCredit += statement.amount * statement.fxRateToBase;
          else report.interestsSummary.netDebit += statement.amount * statement.fxRateToBase;
          report.interestsDetails.push(statement);
          break;

        case StatementTypes.WithHoldingStatement:
          report.interestsSummary.totalAmountInBase += statement.amount * statement.fxRateToBase;
          report.interestsSummary.withHolding += statement.amount * statement.fxRateToBase;
          report.interestsDetails.push(statement);
          break;
      }
    });
    console.log(report.dividendsSummary);
    return report;
  });
};
