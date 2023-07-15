import { Text } from "@chakra-ui/react";
import React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import Layout from "./components/Layout/Layout";

export default function ErrorPage(): JSX.Element {
  const error = useRouteError() as any;
  console.error(error);

  return (
    <Layout>
      <div id="error-page">
        <h1>Oops!</h1>
        <p>Sorry, an unexpected error has occurred.</p>
        <p>
          <strong>{isRouteErrorResponse(error) && <>Error {error.status} </>}</strong>
          <i>{error.statusText || error.message}</i>
          <Text>{error.error.message}</Text>
        </p>
      </div>
    </Layout>
  );
}
