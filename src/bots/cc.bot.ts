import { OptionType, OrderAction } from "@stoqey/ib";
import { Op } from "sequelize";
import { ITradingBot } from ".";
import { Contract, Option, Parameter, Position } from "../models";

interface OptionEx extends Option {
  yield?: number;
}

export class SellCoveredCallsBot extends ITradingBot {
  private async processOnePosition(position: Position): Promise<void> {
    console.log(`processing position: ${position.contract.symbol}`);
    const stock_positions = position.quantity;
    console.log("stock_positions:", stock_positions);
    const stock_sell_orders = -(await this.getContractOrdersQuantity(position.contract, OrderAction.SELL));
    console.log("stock_sell_orders:", stock_sell_orders);
    const call_positions = await this.getOptionsPositionsQuantity(position.contract, "C" as OptionType);
    console.log("call_positions:", call_positions);
    const call_sell_orders = -(await this.getOptionsOrdersQuantity(
      position.contract,
      "C" as OptionType,
      OrderAction.SELL,
    ));
    console.log("call_sell_orders:", call_sell_orders);
    const free_for_this_symbol = stock_positions + call_positions + stock_sell_orders + call_sell_orders;
    console.log("free_for_this_symbol:", free_for_this_symbol);
    if (free_for_this_symbol > 0) {
      const parameter = await Parameter.findOne({
        where: {
          portfolio_id: this.portfolio.id,
          stock_id: position.contract.id,
          ccStrategy: {
            [Op.and]: {
              [Op.not]: null,
              [Op.gt]: 0,
            },
          },
        },
        include: {
          model: Contract,
          required: true,
        },
        // logging: console.log,
      });
      if (
        parameter !== null &&
        parameter.ccStrategy > 0 &&
        // RULE : stock price is higher than previous close
        parameter.underlying.livePrice > parameter.underlying.previousClosePrice
      ) {
        this.printObject(parameter);
        // RULE defensive : strike > cours (OTM) & strike > position avg price
        // RULE agressive : strike > cours (OTM)
        const strike =
          parameter.ccStrategy == 1
            ? Math.max(parameter.underlying.livePrice, position.averagePrice)
            : parameter.underlying.livePrice;
        const options = await Option.findAll({
          where: {
            stock_id: parameter.underlying.id,
            strike: {
              [Op.gt]: strike,
            },
            lastTradeDate: { [Op.gt]: new Date() },
            callOrPut: "C",
            delta: {
              [Op.lt]: 1 - this.portfolio.ccWinRatio, // RULE : delta < 0.25
            },
          },
          include: [
            {
              required: true,
              model: Contract,
              as: "contract",
              where: {
                bid: {
                  [Op.gte]: this.portfolio.minPremium, // RULE : premium (bid) >= 0.25$
                },
              },
            },
            {
              required: true,
              model: Contract,
              as: "stock",
            },
          ],
          // logging: console.log,
        });
        if (options.length > 0) {
          for (const option of options) {
            // const expiry: Date = new Date(option.lastTradeDate);
            const diffDays = Math.ceil((option.lastTradeDate.getTime() - Date.now()) / (1000 * 3600 * 24));
            option["yield"] = (option.contract.bid / option.strike / diffDays) * 360;
            // option.stock.contract = await Contract.findByPk(option.stock.id);
          }
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion,@typescript-eslint/no-non-null-assertion
          options.sort((a: OptionEx, b: OptionEx) => b.yield! - a.yield!);
          // for (const option of options) {
          //     console.log("yield of contract", option["yield"]);
          //     this.printObject(option);
          // }
          const option = options[0];
          this.printObject(option);
          await this.api
            .placeNewOrder(
              ITradingBot.OptionToIbContract(option),
              ITradingBot.CcOrder(
                OrderAction.SELL,
                Math.floor(free_for_this_symbol / option.multiplier),
                option.contract.ask,
              ),
            )
            .then((orderId: number) => {
              console.log("orderid:", orderId.toString());
            });
        } else {
          this.error("options list empty");
        }
      } else {
        console.log("no applicable parameters or current price not higher than previous close price");
      }
    }
  }

  private iteratePositions(positions: Position[]): Promise<void> {
    return positions.reduce((p, position) => {
      return p.then(() => this.processOnePosition(position));
    }, Promise.resolve()); // initial
  }

  private listStockPostitions(): Promise<Position[]> {
    return Position.findAll({
      include: {
        model: Contract,
        where: {
          secType: "STK",
        },
        required: true,
      },
    });
  }

  private process(): void {
    console.log("SellCoveredCallsBot process begin");
    this.listStockPostitions()
      .then((result) => this.iteratePositions(result))
      .then(() => setTimeout(() => this.emit("process"), 3600 * 1000))
      .catch((error) => console.error("cc bot process:", error));
  }

  public start(): void {
    this.init()
      .then(() => {
        this.on("process", () => this.process());
        setTimeout(() => this.emit("process"), 60 * 1000);
      })
      .catch((error) => console.error("cc bot start:", error));
  }
}
