import { ChakraBaseProvider } from "@chakra-ui/react";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import theme from "./theme";

const root = createRoot(document.getElementById("root"));
root.render(
  <ChakraBaseProvider theme={theme}>
    <App />
  </ChakraBaseProvider>,
);
