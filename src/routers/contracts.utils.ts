import { ContractEntry, OptionContractEntry } from ".";
import logger from "../logger";
import { Contract, OptionContract } from "../models";

const MODULE = "contracts_utils";

/* We manually copy each property because we want to get rid of any sequalize non jsonable meta data */
export const contractModelToContractEntry = (contract: Contract): ContractEntry => {
  if (!contract.createdAt || !contract.updatedAt)
    logger.error(MODULE + ".contractModelToContractEntry", `Invalid date for contract #${contract.id}`);
  const result: ContractEntry = {
    // Properties
    id: contract.id,
    conId: contract.conId,
    isin: contract.isin,
    symbol: contract.symbol,
    secType: contract.secType,
    exchange: contract.exchange,
    currency: contract.currency,
    name: contract.name,
    price: contract.price,
    bid: contract.bid,
    ask: contract.ask,
    previousClosePrice: contract.previousClosePrice,
    fiftyTwoWeekLow: contract.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: contract.fiftyTwoWeekHigh,

    // Virtual properties
    livePrice: contract.livePrice,

    // Make JSON compatible
    createdAt: contract.createdAt.getTime(),
    updatedAt: contract.updatedAt.getTime(),

    // Associations
    positions: undefined,
    trades: undefined,
    statements: undefined,
  };
  return result;
};

/* We manually copy each property because we want to get rid of any sequalize non jsonable meta data */
export const optionContractModelToOptionContractEntry = (option: OptionContract): OptionContractEntry => {
  const result: OptionContractEntry = {
    // Properties
    id: option.id,
    stock_id: option.stock_id,
    lastTradeDate: option.lastTradeDate,
    strike: option.strike,
    callOrPut: option.callOrPut,
    multiplier: option.multiplier,
    impliedVolatility: option.impliedVolatility,
    pvDividend: option.pvDividend,
    delta: option.delta,
    gamma: option.gamma,
    vega: option.vega,
    theta: option.theta,

    // Virtual properties
    expiryDate: option.expiryDate.getTime(),
    expiry: option.expiry,
    dte: option.dte,

    // Make JSON compatible
    createdAt: option.createdAt?.getTime(),
    updatedAt: option.createdAt?.getTime(),

    // Associations
    contract: undefined,
    stock: undefined,
  };
  return result;
};
