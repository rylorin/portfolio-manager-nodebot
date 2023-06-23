import cors from "cors";
import express from "express";
import path from "path";
import router from "./routers/api";

const { PORT = 3001 } = process.env;

const StartServer = (): void => {
  const app = express();
  app.use(cors());

  // Middleware that parses json and looks at requests where the Content-Type header matches the type option.
  app.use(express.json());

  // Serve API requests from the router
  app.use("/api", router);

  // Serve storybook production bundle
  app.use("/storybook", express.static("dist/storybook"));

  // Serve app production bundle
  app.use(express.static("dist/app"));

  // Handle client routing, return all requests to the app
  app.get("*", (req, res) => {
    console.log("unknown path:", req.path);
    res.sendFile(path.join(__dirname, "app/index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Server listening at http://localhost:${PORT}`);
  });
};

export default StartServer;
