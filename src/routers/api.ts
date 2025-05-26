import express from "express";
import portfolio from "./portfolio.router";
import repository from "./repository.router";

const router = express.Router();

router.use("/portfolio", portfolio);
router.use("/repository", repository);

// Handle client routing, return all requests to the app
router.put("*splat", (req, _res, next) => {
  console.log("Unknown PUT path:", req.path);
  next();
});

// Handle client routing, return all requests to the app
router.get("*splat", (req, _res, next) => {
  console.log("Unknown GET path:", req.path);
  next();
});

// Handle client routing, return all requests to the app
router.post("*splat", (req, _res, next) => {
  console.log("Unknown POST path:", req.path);
  next();
});

// Handle client routing, return all requests to the app
router.delete("*splat", (req, _res, next) => {
  console.log("Unknown DELETE path:", req.path);
  next();
});

export default router;
