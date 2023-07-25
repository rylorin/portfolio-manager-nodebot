import { DeleteIcon, EditIcon, SearchIcon } from "@chakra-ui/icons";
import { IconButton, Td, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink } from "react-router-dom";
import { OptionPositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { PositionLink } from "./links";

type Props = { portfolioId: number; item: OptionPositionEntry };

const OptionRow: FunctionComponent<Props> = ({ portfolioId, item, ..._rest }): JSX.Element => {
  const getITM = (item: OptionPositionEntry): number => {
    if (!item.stock.price) return undefined;
    else if (item.option.type == "P") {
      return item.option.strike - item.stock.price;
    } else {
      return item.stock.price - item.option.strike;
    }
  };

  const getColor = (item: OptionPositionEntry): string => {
    if (getITM(item) * item.quantity < 0) return "red.500";
    else return "green.500";
  };

  return (
    <>
      <Tr id={`${item.id}`}>
        <Td isNumeric>{formatNumber(item.quantity)}</Td>
        <Td>{item.option.symbol}</Td>
        <Td isNumeric>{formatNumber(item.option.strike, 1)}</Td>
        <Td>{item.option.expiration}</Td>
        <Td>{item.option.type == "P" ? "Put" : "Call"}</Td>
        <Td>{item.contract.currency}</Td>
        <Td isNumeric>
          <Number value={getITM(item)} decimals={1} color={getColor(item)} />
        </Td>
        <Td isNumeric>{formatNumber(item.cost)}</Td>
        <Td isNumeric>{formatNumber(item.value)}</Td>
        <Td isNumeric>
          <Number value={item.pnl} />
        </Td>
        <Td isNumeric>
          <Number value={item.apy} decimals={1} isPercent />
        </Td>
        <Td isNumeric>{formatNumber(item.engaged)}</Td>
        <Td isNumeric>{formatNumber(item.risk)}</Td>
        <Td>
          <RouterLink to={`${PositionLink.toItem(portfolioId, item.id)}`}>
            <IconButton aria-label="Show position" icon={<SearchIcon />} size="xs" variant="ghost" />
          </RouterLink>
          <RouterLink to={`${PositionLink.editItem(portfolioId, item.id)}`}>
            <IconButton aria-label="Edit position" icon={<EditIcon />} size="xs" variant="ghost" />
          </RouterLink>
          <Form method="post" action={`DeletePosition/${item.id}`} className="inline">
            <IconButton aria-label="Delete position" icon={<DeleteIcon />} size="xs" variant="ghost" type="submit" />
          </Form>
        </Td>
      </Tr>
    </>
  );
};

export default OptionRow;
