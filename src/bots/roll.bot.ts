import { OptionType, OrderAction } from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import { Contract, OptionContract, Position, Setting } from "../models";

const ROLL_FREQ: number = parseInt(process.env.ROLL_FREQ) || 10; // mins
const DEFENSIVE_ROLL_DAYS: number = parseInt(process.env.DEFENSIVE_ROLL_DAYS) || 6; // days
const AGRESSIVE_ROLL_DAYS: number = parseInt(process.env.AGRESSIVE_ROLL_DAYS) || 0; // days

export class RollOptionPositionsBot extends ITradingBot {
  private async processOnePosition(position: Position): Promise<void> {
    console.log("processing position:", position.contract.symbol);
    if (position.quantity < 0) {
      // at the moment we only roll short positions
      const order = await this.getContractOrdersQuantity(position.contract, null);
      if (order == 0) {
        const option = await OptionContract.findByPk(position.contract.id, {
          include: { model: Contract, as: "stock" },
        });
        const stock: Contract = await Contract.findByPk(option.stock.id);
        const parameter = await Setting.findOne({
          where: {
            portfolio_id: this.portfolio.id,
            stock_id: option.stock.id,
          },
          include: {
            model: Contract,
            required: true,
          },
        });
        if (parameter !== null) {
          const expiry: Date = new Date(option.lastTradeDate);
          const now: number = Date.now();
          const diffDays = Math.ceil((expiry.getTime() - now) / (1000 * 3600 * 24));
          console.log("stock price:", stock.symbol, stock.livePrice);
          if (option.callOrPut == OptionType.Put) {
            // PUT
            const rolllist = await OptionContract.findAll({
              where: {
                stock_id: option.stock.id,
                strike: { [Op.lte]: option.strike },
                lastTradeDate: { [Op.gt]: option.lastTradeDate },
                callOrPut: option.callOrPut,
              },
              include: {
                model: Contract,
                as: "contract",
                where: {
                  bid: {
                    [Op.and]: {
                      [Op.not]: null,
                      [Op.gt]: position.contract.ask,
                    },
                  },
                  updatedAt: {
                    [Op.gt]: new Date(now - 1000 * 3600 * 4), // updated less than 4 hours ago
                  },
                },
                required: true,
              },
              // logging: console.log,
            }).then((result) =>
              result.sort((a, b) => {
                if (a.lastTradeDate > b.lastTradeDate) return 1;
                else if (a.lastTradeDate < b.lastTradeDate) return -1;
                else return b.strike - a.strike;
              }),
            );
            // this.printObject(rolllist);
            if (rolllist.length > 0) {
              let defensive: OptionContract = undefined; // lowest delta
              let agressive: OptionContract = undefined; // first OTM
              // rolllist is ordered by expiration date ASC strike DESC
              for (const opt of rolllist) {
                // agressive is the first contract with strike under stock price
                if (!agressive && opt.strike < stock.livePrice) {
                  agressive = opt;
                  // in the worst case defensive is the same
                  defensive = opt;
                } else if (defensive) {
                  // try to improve defensive delta
                  if (defensive.delta != null && opt.delta > defensive.delta) defensive = opt;
                  // try to improve defensive strike if delta not defined
                  if (defensive.delta == null && opt.strike < defensive.strike) defensive = opt;
                }
                if (!defensive && opt.delta !== null) defensive = opt;
                if (opt.delta !== null && opt.delta > defensive.delta) defensive = opt;
              }
              if (!defensive && !agressive) {
                defensive = rolllist[0];
                agressive = rolllist[0];
              } else {
                if (!defensive) defensive = agressive;
                if (!agressive) agressive = defensive;
              }
              // this.printObject(rolllist);
              console.log("option contract for agressive strategy:");
              this.printObject(agressive);
              console.log("option contract for defensive strategy:");
              this.printObject(defensive);
              let selected: OptionContract = undefined;
              let price: number = undefined;
              if (!parameter.rollPutStrategy) {
                console.log("rollPutStrategy set to: off");
              } else if (
                (parameter.rollPutStrategy == 1 && diffDays > DEFENSIVE_ROLL_DAYS) ||
                (parameter.rollPutStrategy == 2 && diffDays > AGRESSIVE_ROLL_DAYS)
              ) {
                console.log("too early to roll contract:", diffDays, "days before exipiration");
              } else {
                if (parameter.rollPutStrategy == 1 && defensive) {
                  selected = defensive;
                  price = position.contract.ask - defensive.contract.bid;
                } else if (parameter.rollPutStrategy == 2 && agressive) {
                  selected = agressive;
                  price = position.contract.ask - agressive.contract.bid;
                }
                await this.api
                  .placeNewOrder(
                    ITradingBot.OptionComboContract(stock, selected.contract.conId, position.contract.conId),
                    ITradingBot.ComboLimitOrder(OrderAction.SELL, Math.abs(position.quantity), -price),
                  )
                  .then((orderId: number) => {
                    console.log("orderid:", orderId.toString());
                  });
              }
            } else {
              this.warn("can not roll contract: empty list");
            }
          } else if (option.callOrPut == OptionType.Call) {
            // CALL
            const rolllist = await OptionContract.findAll({
              where: {
                stock_id: option.stock.id,
                strike: { [Op.gte]: option.strike },
                lastTradeDate: { [Op.gt]: option.lastTradeDate },
                callOrPut: option.callOrPut,
              },
              include: {
                model: Contract,
                as: "contract",
                where: {
                  bid: {
                    [Op.and]: {
                      [Op.not]: null,
                      [Op.gt]: position.contract.ask,
                    },
                  },
                  updatedAt: {
                    [Op.gt]: new Date(now - 1000 * 3600 * 24), // updated less than 1 day ago
                  },
                },
              },
            }).then((result) =>
              result.sort((a, b) => {
                if (a.lastTradeDate > b.lastTradeDate) return 1;
                else if (a.lastTradeDate < b.lastTradeDate) return -1;
                else return a.strike - b.strike;
              }),
            );
            // console.log("parameters:")
            // this.printObject(parameter);
            if (rolllist.length > 0) {
              let defensive: OptionContract = undefined; // lowest delta
              let agressive: OptionContract = undefined; // first OTM
              for (const opt of rolllist) {
                if (!agressive && opt.strike > stock.livePrice) agressive = opt;
                if (!defensive && opt.delta !== null) defensive = opt;
                if (opt.delta !== null && opt.delta < defensive.delta) defensive = opt;
              }
              if (!defensive && !agressive) {
                defensive = rolllist[0];
                agressive = rolllist[0];
              } else {
                if (!defensive) defensive = agressive;
                if (!agressive) agressive = defensive;
              }
              // this.printObject(rolllist);
              console.log("option contract for defensive strategy:");
              this.printObject(defensive);
              console.log("option contract for agressive strategy:");
              this.printObject(agressive);
              let selected: OptionContract = undefined;
              let price: number = undefined;
              if (!parameter.rollCallStrategy) {
                console.log("rollCallStrategy set to: off");
              } else if (
                (parameter.rollCallStrategy == 1 && diffDays > DEFENSIVE_ROLL_DAYS) ||
                (parameter.rollCallStrategy == 2 && diffDays > AGRESSIVE_ROLL_DAYS)
              ) {
                console.log("too early to roll contract:", diffDays, "days before exipiration");
              } else {
                if (parameter.rollCallStrategy == 1 && defensive) {
                  selected = defensive;
                  price = position.contract.ask - defensive.contract.bid;
                } else if (parameter.rollCallStrategy == 2 && agressive) {
                  selected = agressive;
                  price = position.contract.ask - agressive.contract.bid;
                }
                await this.api
                  .placeNewOrder(
                    ITradingBot.OptionComboContract(stock, selected.contract.conId, position.contract.conId),
                    ITradingBot.ComboLimitOrder(OrderAction.SELL, Math.abs(position.quantity), -price),
                  )
                  .then((orderId: number) => {
                    console.log("orderid:", orderId.toString());
                  });
              }
            } else {
              this.warn("can not roll contract: empty list");
            }
          }
        } else {
          console.warn("no parameters available for underlying");
        }
      } else {
        console.log("ignored (already in open orders list)");
      }
    }
  }

  private iteratePositions(positions: Position[]): Promise<void> {
    return positions.reduce((p, position) => {
      return p.then(() => this.processOnePosition(position));
    }, Promise.resolve()); // initial
  }

  private listItmOptionPostitions(): Promise<Position[]> {
    return Position.findAll({ include: Contract }).then(async (positions) => {
      const result: Position[] = [];
      for (const position of positions) {
        if (position.contract.secType == "OPT" && position.quantity) {
          const opt = await OptionContract.findByPk(position.contract.id, {
            include: { model: Contract, as: "stock" },
          });
          const stock: Contract = await Contract.findByPk(opt.stock.id, {});
          const price = stock.livePrice;
          // console.log(price);
          if (price != null && opt.callOrPut == OptionType.Put && price < opt.strike) {
            // this.printObject(opt);
            // this.printObject(stock);
            result.push(position);
          } else if (price != null && opt.callOrPut == OptionType.Call && price > opt.strike) {
            // this.printObject(opt);
            // this.printObject(stock);
            result.push(position);
          }
        }
      }
      return result;
    });
  }

  public process(): void {
    console.log("RollOptionPositionsBot process begin");
    this.listItmOptionPostitions()
      .then((result) => this.iteratePositions(result))
      .then(() => setTimeout(() => this.emit("process"), ROLL_FREQ * 60000))
      .catch((error) => console.error("roll bot:", error));
  }

  public start(): void {
    this.init()
      .then(() => {
        this.on("process", () => this.process());
        setTimeout(() => this.emit("process"), 6000);
      })
      .catch((error) => console.error("roll bot start:", error));
  }
}
