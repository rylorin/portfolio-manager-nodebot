import dotenv from "dotenv";
dotenv.config(); // eslint-disable-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-call

import createProxyMiddleware from "http-proxy-middleware";

const { PORT = 3001 } = process.env;

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: `http://localhost:${PORT}`,
      changeOrigin: true,
    }),
  );
};
