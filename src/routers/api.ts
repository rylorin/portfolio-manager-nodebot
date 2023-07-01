import express from "express";
import portfolio from "./portfolio.router";

const router = express.Router();

router.use("/portfolio", portfolio);

// Handle client routing, return all requests to the app
router.get("*", (req, _res, next) => {
  console.log("unknown API path:", req.path);
  next();
});

export default router;
