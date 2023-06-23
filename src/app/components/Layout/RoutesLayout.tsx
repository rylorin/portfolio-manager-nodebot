import { FunctionComponent, default as React } from "react";
import { Outlet } from "react-router-dom";
import Layout from "./Layout";

type RoutesLayoutProps = {};

const RoutesLayout: FunctionComponent<RoutesLayoutProps> = (): JSX.Element => {
  return (
    <Layout>
      {/* Render the app routes via the Layout Outlet */}
      <Outlet />
    </Layout>
  );
};

export default RoutesLayout;
