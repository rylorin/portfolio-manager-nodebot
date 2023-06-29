import { Td } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

export type TotalEntry = {
  id: string;
  expiration: string;
  units: number;
  cost: number;
  value: number;
  pnl: number;
  engaged: number;
  risk: number;
};

type Props = { subTotal: TotalEntry };

const SubTotalRowContent: FunctionComponent<Props> = ({ subTotal, ..._rest }): JSX.Element => {
  return (
    <>
      <Td isNumeric fontWeight="semibold">
        {formatNumber(subTotal.units)}
      </Td>
      <Td></Td>
      <Td></Td>
      <Td fontWeight="semibold">{subTotal.expiration}</Td>
      <Td></Td>
      <Td>Base</Td>
      <Td></Td>
      <Td isNumeric fontWeight="semibold">
        {formatNumber(subTotal.cost)}
      </Td>
      <Td isNumeric fontWeight="semibold">
        {formatNumber(subTotal.value)}
      </Td>
      <Td isNumeric fontWeight="semibold">
        <Number value={subTotal.pnl} />
      </Td>
      <Td></Td>
      <Td isNumeric fontWeight="semibold">
        <Number value={subTotal.engaged} />
      </Td>
      <Td isNumeric fontWeight="semibold">
        <Number value={subTotal.risk} />
      </Td>
      <Td></Td>
    </>
  );
};

export default SubTotalRowContent;
