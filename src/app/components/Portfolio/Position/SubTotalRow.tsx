import { Td, Tr, useColorModeValue } from "@chakra-ui/react";
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

const SubTotalRow: FunctionComponent<Props> = ({ subTotal, ..._rest }): React.ReactNode => {
  const bg = useColorModeValue("gray.200", "gray.700");

  return (
    <>
      <Tr id={`${subTotal.id}`} bg={bg}>
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
      </Tr>
    </>
  );
};

export default SubTotalRow;
