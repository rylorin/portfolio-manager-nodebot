import { default as express } from "express";
import logger from "../logger";
import { Currency, OpenOrder, Portfolio } from "../models";
import { OrderEntry } from "./";
import { contractModelToContractEntry } from "./contracts.utils";

const MODULE = "OrdersRouter";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const _sequelize_logging = (...args: any[]): void => logger.trace(MODULE + ".squelize", ...args);

export const router = express.Router({ mergeParams: true });

interface parentParams {
  portfolioId: number;
}

const prepareOrder = (order: OpenOrder): OrderEntry => {
  return {
    id: order.id,
    permId: order.permId,
    orderId: order.orderId,
    clientId: order.clientId,
    portfolioId: order.portfolioId,
    actionType: order.actionType,
    totalQty: order.totalQty,
    cashQty: order.cashQty,
    lmtPrice: order.lmtPrice,
    auxPrice: order.auxPrice,
    status: order.status,
    remainingQty: order.remainingQty,
    contractId: order.contractId,
    contract: contractModelToContractEntry(order.contract),
  };
};

/* +++++ Routes +++++ */

/**
 * List all open orders
 */
router.get("/index", (req, res): void => {
  const { portfolioId } = req.params as typeof req.params & parentParams;
  logger.trace(MODULE + ".OrdersIndex", portfolioId);

  Portfolio.findByPk(portfolioId, {
    include: [
      {
        association: "orders",
        include: [{ association: "contract" }],
      },
      { model: Currency, as: "baseRates" },
    ],
    // logging: console.log,
  })
    .then((portfolio) => portfolio.orders.map(prepareOrder))
    .then((orders) => {
      console.log("orders", orders);
      return orders;
    })
    .then((orders: OrderEntry[]) => res.status(200).json({ orders }))
    .catch((error) => {
      console.error(error);
      logger.error(MODULE + ".OrdersIndex", error);
      res.status(500).json({ error });
    });
});

/**
 * Delete a open order
 */
router.delete("/:orderId(\\d+)/DeleteOrder", (req, res): void => {
  const { orderId } = req.params as typeof req.params & parentParams;

  OpenOrder.findByPk(orderId)
    .then(async (order) => {
      if (order) return order.destroy();
      else throw Error(`Open order #${orderId} not found`);
    })
    .then(() => res.status(200).end())
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Catch all url
 */
router.get("*", (req, _res, next): void => {
  console.log("unknown orders path:", req.path);
  next();
});

export default router;
