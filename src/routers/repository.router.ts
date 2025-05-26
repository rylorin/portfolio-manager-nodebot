import { SecType } from "@stoqey/ib";
import express from "express";
import { Contract, OptionContract } from "../models";
import { contractModelToContractEntry } from "./contracts.utils";

const router = express.Router();

/**
 * Fetch all stock contracts
 */
router.get("/stocks/", (req, res): void => {
  Contract.findAll({ where: { secType: SecType.STK } })
    .then((contracts) => contracts.map((item) => contractModelToContractEntry(item)))
    .then((contracts) => res.status(200).json({ contracts }))
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Fetch an option contract
 */
router.get("/options/:optionId(\\d+)", (req, res): void => {
  const { optionId } = req.params;
  OptionContract.findByPk(optionId, { include: { model: Contract, as: "contract" } })
    .then((option) => {
      res.status(200).json({ option });
    })
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Fetch a single contract
 */
router.get("/contracts/:contractId(\\d+)", (req, res): void => {
  const { contractId } = req.params;
  Contract.findByPk(contractId)
    .then((contract) => {
      res.status(200).json({ contract });
    })
    .catch((error) => res.status(500).json({ error }));
});

/**
 * Catch all
 */
router.get("*splat", (req, _res, next): void => {
  console.log("unknown Repository path:", req.path);
  next();
});

export default router;
