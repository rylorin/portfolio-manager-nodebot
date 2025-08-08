import { IconButton, Link, Table } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { LuTrash2 as DeleteIcon, LuPencil as EditIcon, LuSearch as SearchIcon } from "react-icons/lu";
import { Form, Link as RouterLink } from "react-router-dom";
import { OptionPositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { PositionLink } from "./links";

interface Props {
  portfolioId: number;
  item: OptionPositionEntry;
}

const OptionRow: FunctionComponent<Props> = ({ portfolioId, item, ..._rest }): React.ReactNode => {
  const getITM = (item: OptionPositionEntry): number => {
    if (!item.underlying.price) return undefined;
    else if (item.option.type == "P") {
      return item.option.strike - item.underlying.price;
    } else {
      return item.underlying.price - item.option.strike;
    }
  };

  const getColor = (item: OptionPositionEntry): string => {
    if (getITM(item) * item.quantity < 0) return "red.500";
    else return "green.500";
  };

  return (
    <>
      <Table.Row id={`${item.id}`}>
        <Table.Cell textAlign="end">{formatNumber(item.quantity)}</Table.Cell>
        <Table.Cell>
          <Link asChild>
            <RouterLink to={ContractLink.toItem(portfolioId, item.underlying.id)}>{item.option.symbol}</RouterLink>
          </Link>
        </Table.Cell>
        <Table.Cell textAlign="end">{formatNumber(item.option.strike, 1)}</Table.Cell>
        <Table.Cell>{item.option.expiration}</Table.Cell>
        <Table.Cell>{item.option.type == "P" ? "Put" : "Call"}</Table.Cell>
        <Table.Cell>{item.contract.currency}</Table.Cell>
        <Table.Cell textAlign="end">
          <Number value={getITM(item)} decimals={1} color={getColor(item)} />
        </Table.Cell>
        <Table.Cell textAlign="end">{formatNumber(item.cost)}</Table.Cell>
        <Table.Cell textAlign="end">{formatNumber(item.value)}</Table.Cell>
        <Table.Cell textAlign="end">
          <Number value={item.pnl} />
        </Table.Cell>
        <Table.Cell textAlign="end">
          <Number value={item.apy} decimals={1} isPercent />
        </Table.Cell>
        <Table.Cell textAlign="end">{formatNumber(item.engaged)}</Table.Cell>
        <Table.Cell textAlign="end">{formatNumber(item.risk)}</Table.Cell>
        <Table.Cell>
          <RouterLink to={`${PositionLink.toItem(portfolioId, item.id)}`}>
            <IconButton aria-label="Show position" size="xs" variant="ghost">
              <SearchIcon />
            </IconButton>
          </RouterLink>
          <RouterLink to={`${PositionLink.editItem(portfolioId, item.id)}`}>
            <IconButton aria-label="Edit position" size="xs" variant="ghost">
              <EditIcon />
            </IconButton>
          </RouterLink>
          <Form method="post" action={`DeletePosition/${item.id}`} className="inline">
            <IconButton aria-label="Delete position" size="xs" variant="ghost" type="submit">
              <DeleteIcon />
            </IconButton>
          </Form>
        </Table.Cell>
      </Table.Row>
    </>
  );
};

export default OptionRow;
