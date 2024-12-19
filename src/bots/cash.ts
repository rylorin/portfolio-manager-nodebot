import { Contract as IbContract, Order as IbOrder, OptionType, OrderAction, OrderType, TimeInForce } from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import { OpenOrder } from "../models";
import { CashStrategy } from "../models/portfolio.types";

const BenchmarkOrder = (action: OrderAction, quantity: number): IbOrder => {
  const order: IbOrder = {
    action: action,
    orderType: OrderType.MOC,
    totalQuantity: quantity,
    tif: TimeInForce.DAY,
    transmit: true,
  };
  return order;
};

export const processCashManagement = async (bot: ITradingBot): Promise<void> => {
  const benchmark = bot.portfolio.benchmark;
  const benchmark_value =
    (await bot.getContractPositionValueInBase(benchmark)) +
    (await bot.getOptionsPositionsRiskInBase(benchmark.id, OptionType.Put));
  const balance_in_base: number = await bot.getTotalBalanceInBase();
  const benchmark_balance_in_base: number = await bot.getBalanceInBase(benchmark.currency);
  const benchmark_units: number = await bot.getContractPosition(benchmark);

  let extra_cash: number;
  if (!bot.portfolio.cashStrategy) {
    extra_cash = 0;
  } else if (bot.portfolio.cashStrategy == CashStrategy.Balance) {
    // manage cash balance
    extra_cash = benchmark_balance_in_base;
  } else if (bot.portfolio.cashStrategy == CashStrategy["Options value"]) {
    // options value: cash needed to close all options positions
    let opt_value = await bot.getOptionPositionsValueInBase(undefined, undefined);
    opt_value = Math.max(opt_value, 0);
    extra_cash = balance_in_base - opt_value;
  } else if (bot.portfolio.cashStrategy == CashStrategy["Options risk"]) {
    // option risk: cash to cover options risk
    let opt_value = await bot.getOptionsPositionsRiskInBase(undefined, OptionType.Put);
    opt_value = Math.max(opt_value, 0);
    extra_cash = balance_in_base - opt_value;
  } else {
    throw Error(`unimplemented cash strategy ${bot.portfolio.cashStrategy}`); // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }

  let units_to_buy = 0;
  let units_to_sell = 0;
  if (extra_cash < 0) {
    // we need to sell some benchmark units
    if (-extra_cash > benchmark_value) extra_cash = -benchmark_value;
    units_to_sell = Math.min(Math.ceil(-extra_cash / benchmark.livePrice), benchmark_units);
  } else if (extra_cash > benchmark.livePrice) {
    // we can buy some benchmark units
    if (extra_cash > benchmark_balance_in_base) extra_cash = benchmark_balance_in_base;
    units_to_buy = Math.floor(extra_cash / benchmark.livePrice);
  }

  const benchmark_on_buy =
    (await bot.getContractOrdersQuantity(benchmark, OrderAction.BUY)) +
    (await bot.getOptionsOrdersQuantity(benchmark, OptionType.Put, OrderAction.SELL));
  const benchmark_on_sell = await bot.getContractOrdersQuantity(benchmark, OrderAction.SELL);
  console.log(
    `strategy ${bot.portfolio.cashStrategy} extra_cash ${extra_cash} to buy ${units_to_buy} to sell ${units_to_sell} on buy ${benchmark_on_buy} on sell ${benchmark_on_sell}`,
  );
  if (bot.portfolio.cashStrategy && benchmark_on_buy - benchmark_on_sell != units_to_buy - units_to_sell) {
    // cancel any pending order
    await OpenOrder.findAll({
      where: {
        portfolio_id: bot.portfolio.id,
        contract_id: bot.portfolio.benchmark.id,
        orderId: { [Op.ne]: 0 },
      },
    }).then(async (orders) =>
      orders.reduce(async (p, order) => {
        return p.then(() => bot.cancelOrder(order.orderId));
      }, Promise.resolve()),
    );
    if (units_to_buy > 0) {
      bot.info("buying", units_to_buy, "units of", benchmark.symbol);
      await bot
        .placeNewOrder(benchmark as IbContract, BenchmarkOrder(OrderAction.BUY, units_to_buy))
        .then((orderId: number) => {
          bot.info("orderid", orderId, "placed");
        });
    }
    if (units_to_sell > 0) {
      bot.info("selling", units_to_sell, "units of", benchmark.symbol);
      await bot
        .placeNewOrder(benchmark as IbContract, BenchmarkOrder(OrderAction.SELL, units_to_sell))
        .then((orderId: number) => {
          bot.info("orderid", orderId, "placed");
        });
    }
  }
};
