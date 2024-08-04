import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";

const getExpiration = (item: PositionEntry | OptionPositionEntry): string | undefined => {
  switch (item.contract.secType) {
    case ContractType.Stock:
      return undefined;
    case ContractType.Option:
    case ContractType.FutureOption: // Not implemented yet
      return (item as OptionPositionEntry).option.expiration;
    case ContractType.Future:
      return item.contract.expiration;
    case ContractType.Bond:
      console.log(item.contract);
      return item.contract.expiration;
    default:
      throw Error(`getExpiration: contract type '${item.contract.secType}' not implemented!`);
  }
};

const getSymbol = (item: PositionEntry | OptionPositionEntry): string | undefined => {
  switch (item.contract.secType) {
    case ContractType.Stock:
    case ContractType.Future:
      return item.contract.symbol;
    case ContractType.Option:
    case ContractType.FutureOption: // Not implemented yet
      return (item as OptionPositionEntry).underlying.symbol;
    case ContractType.Bond:
      return item.contract.name.substring(0, item.contract.name.indexOf(" "));
    default:
      throw Error(`getSymbol: contract type '${item.contract.secType}' not implemented!`);
  }
};

const compareExpirations = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
  let result: number;
  const aExpiration = getExpiration(a);
  const bExpiration = getExpiration(b);
  if (!aExpiration && !bExpiration) result = 0;
  else if (!aExpiration && bExpiration) result = +1;
  else if (aExpiration && !bExpiration) result = -1;
  else {
    // We have expiration dates both for a and for b
    result = aExpiration.localeCompare(bExpiration);
  }
  return result;
};

const compareSymbols = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
  const aSymbol = getSymbol(a);
  const bSymbol = getSymbol(b);
  return aSymbol.localeCompare(bSymbol);
};

const _secTypeOrder = {
  [ContractType.Bag]: 0,
  [ContractType.Index]: 1,
  [ContractType.Stock]: 2,
  [ContractType.Future]: 3,
  [ContractType.Bond]: 4,
  [ContractType.Cash]: 5,
  [ContractType.Option]: 6,
  [ContractType.FutureOption]: 7,
};

const compareSecTypes = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
  if (a.contract.secType == b.contract.secType) return 0;
  else {
    switch (a.contract.secType) {
      case ContractType.Stock:
      case ContractType.Index:
      case ContractType.Future:
        return -1;
      case ContractType.Option:
      case ContractType.FutureOption:
        return 1;
      default:
        return 0;
    }
  }
};

export const comparePositions = (
  a: PositionEntry | OptionPositionEntry,
  b: PositionEntry | OptionPositionEntry,
): number => {
  let result = 0;

  // sort by symbol
  if (!result) result = compareSymbols(a, b);

  // sort by contract type
  if (!result) result = compareSecTypes(a, b);

  // sort by expiration
  if (!result) result = compareExpirations(a, b);

  if (!result) {
    if (
      (a.contract.secType == ContractType.Option || a.contract.secType == ContractType.FutureOption) &&
      (b.contract.secType == ContractType.Option || b.contract.secType == ContractType.FutureOption)
    )
      result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
    if (result == 0) {
      if ((a as OptionPositionEntry).option.type == "C") result = 1;
      else result = -1;
    }
  }

  return result;
};
