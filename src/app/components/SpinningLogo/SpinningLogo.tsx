import { Image } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import styles from "./SpinningLogo.module.css";

interface SpinningLogoProps {
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
}

const SpinningLogo: FunctionComponent<SpinningLogoProps> = ({ src, ...rest }): JSX.Element => (
  <Image src={src} className={styles["App-logo"]} {...rest} />
);

export default SpinningLogo;
