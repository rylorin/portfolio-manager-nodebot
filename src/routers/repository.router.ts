import express from "express";
import { Contract, Option } from "../models";

const router = express.Router();

// export const contractModelToContractEntry = () => {};

/**
 * Fetch an option contract
 */
router.get("/options/:optionId(\\d+)", (req, res): void => {
  const { optionId } = req.params;
  Option.findByPk(optionId, { include: { model: Contract, as: "contract" } })
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
router.get("*", (req, _res, next): void => {
  console.log("unknown Repository path:", req.path);
  next();
});

export default router;
