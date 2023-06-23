import { Text, TextProps } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";

type NumberProps = {
  /** Value to render */
  value: number;
  /** Number of decimals digits */
  decimals?: number;
  /** Text color */
  color?: string;
  /** Add a percent sign */
  isPercent?: boolean;
} & TextProps;

const Number: FunctionComponent<NumberProps> = ({ value, decimals = 0, color, isPercent, ...rest }): JSX.Element => {
  const rounded = value
    ? (isPercent ? value * 100 : value).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "-";
  let style: { color: string };
  if (color) {
    style = { color };
  } else if (value > 0) {
    style = { color: "green.500" };
  } else if (value < 0) {
    style = { color: "red.500" };
  }
  return (
    <Text {...style} {...rest} align="right">
      {rounded}
      {isPercent && "%"}
    </Text>
  );
};

export default Number;
