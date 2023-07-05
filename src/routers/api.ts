import express from "express";
import portfolio from "./portfolio.router";
import repository from "./repository.router";

const router = express.Router();

router.use("/portfolio", portfolio);
router.use("/repository", repository);

// Handle client routing, return all requests to the app
router.get("*", (req, _res, next) => {
  console.log("unknown API path:", req.path);
  next();
});

export default router;
