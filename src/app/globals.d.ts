/* modules declarations from react-scripts to allow import of svg and css files */
/* https://github.com/facebook/create-react-app/blob/main/packages/react-scripts/lib/react-app.d.ts */

declare module "*.svg" {
  import * as React from "react";

  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;

  const src: string;
  export default src;
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
