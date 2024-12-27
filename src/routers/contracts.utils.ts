import { ContractEntry } from ".";
import { Contract } from "../models";

/* We manually copy each property because we want to get rid of any sequalize non jsonable meta data */
export const contractModelToContractEntry = (contract: Contract): ContractEntry => {
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
    updatedAt: contract.createdAt.getTime(),

    // Associations
    positions: undefined,
    trades: undefined,
    statements: undefined,
  };
  return result;
};
