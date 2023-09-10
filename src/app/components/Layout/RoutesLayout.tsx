import { FunctionComponent, default as React } from "react";
import { Outlet } from "react-router-dom";
import Layout from "./Layout";

type RoutesLayoutProps = Record<string, never>;

const RoutesLayout: FunctionComponent<RoutesLayoutProps> = (): React.JSX.Element => {
  return (
    <Layout>
      {/* Render the app routes via the Layout Outlet */}
      <Outlet />
    </Layout>
  );
};

export default RoutesLayout;
