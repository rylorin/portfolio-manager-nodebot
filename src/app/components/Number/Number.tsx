import { Text, TextProps } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { formatNumber } from "../../utils";

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

const Number: FunctionComponent<NumberProps> = ({
  value,
  decimals = 0,
  isPercent = false,
  color,
  ...rest
}): React.ReactNode => {
  const rounded = formatNumber(value, decimals, isPercent);
  let style: { color: string };
  if (color) {
    if (color !== "-") style = { color };
  } else if (value > 0) {
    style = { color: "green.500" };
  } else if (value < 0) {
    style = { color: "red.500" };
  }
  return (
    <Text {...style} {...rest} alignContent="end" as="span">
      {rounded}
    </Text>
  );
};

export default Number;
