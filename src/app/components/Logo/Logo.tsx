import { Image } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";

type LogoProps = {
  /**
   * Source URL
   */
  src: string;
  /**
   * Alternative text
   */
  alt?: string;
  /**
   * Width
   */
  w?: string;
  /**
   * Height
   */
  h?: string;
};

const Logo: FunctionComponent<LogoProps> = ({ src, alt, w, h, ...rest }): React.JSX.Element => (
  <Image src={src} alt={alt} w={w} h={h} {...rest} />
);

export default Logo;
