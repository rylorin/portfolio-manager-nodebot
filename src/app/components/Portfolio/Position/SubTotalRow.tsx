import { Table } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { useColorModeValue } from "../../ui/color-mode";

export interface TotalEntry {
  id: string;
  expiration: string;
  units: number;
  cost: number;
  value: number;
  pnl: number;
  engaged: number;
  risk: number;
}

interface Props {
  subTotal: TotalEntry;
}

const SubTotalRow: FunctionComponent<Props> = ({ subTotal, ..._rest }): React.ReactNode => {
  const bg = useColorModeValue("gray.200", "gray.700");

  return (
    <>
      <Table.Row id={`${subTotal.id}`} bg={bg}>
        <Table.Cell textAlign="end" fontWeight="semibold">
          {formatNumber(subTotal.units)}
        </Table.Cell>
        <Table.Cell></Table.Cell>
        <Table.Cell></Table.Cell>
        <Table.Cell fontWeight="semibold">{subTotal.expiration}</Table.Cell>
        <Table.Cell></Table.Cell>
        <Table.Cell>Base</Table.Cell>
        <Table.Cell></Table.Cell>
        <Table.Cell textAlign="end" fontWeight="semibold">
          {formatNumber(subTotal.cost)}
        </Table.Cell>
        <Table.Cell textAlign="end" fontWeight="semibold">
          {formatNumber(subTotal.value)}
        </Table.Cell>
        <Table.Cell textAlign="end" fontWeight="semibold">
          <Number value={subTotal.pnl} />
        </Table.Cell>
        <Table.Cell></Table.Cell>
        <Table.Cell textAlign="end" fontWeight="semibold">
          <Number value={subTotal.engaged} />
        </Table.Cell>
        <Table.Cell textAlign="end" fontWeight="semibold">
          <Number value={subTotal.risk} />
        </Table.Cell>
        <Table.Cell></Table.Cell>
      </Table.Row>
    </>
  );
};

export default SubTotalRow;
