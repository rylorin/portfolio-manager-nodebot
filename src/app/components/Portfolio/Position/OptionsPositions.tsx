import { DeleteIcon, EditIcon, SearchIcon } from "@chakra-ui/icons";
import {
  Box,
  IconButton,
  Link,
  Spacer,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Tfoot,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData } from "react-router-dom";
import { OptionPositionEntry } from "../../../../routers/types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type PositionsIndexProps = Record<string, never>;

type TotalEntry = {
  expiration: string;
  units: number;
  cost: number;
  value: number;
  pnl: number;
  engaged: number;
  risk: number;
};
/**
 * Statements list component
 * @param param0
 * @returns
 */
const OptionsPositions: FunctionComponent<PositionsIndexProps> = ({ ..._rest }): JSX.Element => {
  const bg = useColorModeValue("gray.200", "gray.900");
  const thePositions = useLoaderData() as OptionPositionEntry[];
  let subTotal: TotalEntry;

  const SubTotalRow = (): JSX.Element => {
    return subTotal ? (
      <>
        <Tr fontWeight="semibold" key={subTotal.expiration} bg={bg}>
          <Td isNumeric>{formatNumber(subTotal.units)}</Td>
          <Td>key={subTotal.expiration}</Td>
          <Td></Td>
          <Td>{subTotal.expiration}</Td>
          <Td></Td>
          <Td>Base</Td>
          <Td></Td>
          <Td isNumeric>{formatNumber(subTotal.cost)}</Td>
          <Td isNumeric>{formatNumber(subTotal.value)}</Td>
          <Td isNumeric>
            <Number value={subTotal.pnl} />
          </Td>
          <Td></Td>
          <Td isNumeric>
            <Number value={subTotal.engaged} />
          </Td>
          <Td isNumeric>
            <Number value={subTotal.risk} />
          </Td>
          <Td></Td>
        </Tr>
      </>
    ) : undefined;
  };

  const initSubtotal = (item: OptionPositionEntry): JSX.Element => {
    subTotal = { expiration: item.option.expiration, units: 0, cost: 0, value: 0, engaged: 0, risk: 0, pnl: 0 };
    return undefined;
  };

  const addToSubtotal = (item: OptionPositionEntry): JSX.Element => {
    let result: JSX.Element;
    if (!subTotal) {
      initSubtotal(item);
    } else if (item.option.expiration != subTotal.expiration) {
      // new expiration, emit subtotal
      result = SubTotalRow();
      // init new subtotal
      initSubtotal(item);
    }
    // console.log(item);
    // increment totals
    subTotal.units += Math.abs(item.quantity);
    subTotal.cost += item.cost * item.baseRate;
    subTotal.value += item.value * item.baseRate;
    subTotal.engaged += item.engaged * item.baseRate;
    subTotal.risk += item.risk * item.baseRate;
    subTotal.pnl += item.pnl * item.baseRate;
    // console.log(subTotal);

    return result;
  };

  const compareItems = (a: OptionPositionEntry, b: OptionPositionEntry): number => {
    let result;
    result = a.option.expiration.localeCompare(b.option.expiration);
    if (!result) {
      result = a.option.symbol.localeCompare(b.option.symbol);
      if (!result) result = a.option.strike - b.option.strike;
    }
    return result;
  };

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
      <Box>
        <Spacer />
        <Link to={"../all"} as={RouterLink}>
          All
        </Link>
        {" | "}
        <Link to={"../options"} as={RouterLink}>
          Options
        </Link>
        <Spacer />
      </Box>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Statements index ({thePositions.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Units</Td>
              <Td>Symbol</Td>
              <Td>Strike</Td>
              <Td>Expiration</Td>
              <Td>Type</Td>
              <Td>Curr.</Td>
              <Td>ITM</Td>
              <Td>Cost</Td>
              <Td>Value</Td>
              <Td>PNL</Td>
              <Td>APY</Td>
              <Td>Engaged</Td>
              <Td>At risk</Td>
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {thePositions
              .sort((a, b) => compareItems(a, b))
              .map((item) => (
                <>
                  {addToSubtotal(item)}
                  <Tr key={item.id}>
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
                      <Form method="post" action={`id/${item.id}`} className="inline">
                        <IconButton
                          aria-label="Show position"
                          icon={<SearchIcon />}
                          size="xs"
                          variant="link"
                          type="submit"
                        />
                      </Form>
                      <IconButton aria-label="Guess trade" icon={<EditIcon />} size="xs" variant="ghost" />
                      <Form method="post" action={`DeletePosition/${item.id}`} className="inline">
                        <IconButton
                          aria-label="Delete position"
                          icon={<DeleteIcon />}
                          size="xs"
                          variant="link"
                          type="submit"
                        />
                      </Form>
                    </Td>
                  </Tr>
                </>
              ))}
            <SubTotalRow />
          </Tbody>
          <Tfoot>
            <Tr fontWeight="bold">
              <Td>Total</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td>Base</Td>
              <Td></Td>
              <Td isNumeric>{formatNumber(thePositions.reduce((p, v) => (p += (v.cost || 0) * v.baseRate), 0))}</Td>
              <Td isNumeric>{formatNumber(thePositions.reduce((p, v) => (p += (v.value || 0) * v.baseRate), 0))}</Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.value - v.cost || 0) * v.baseRate), 0)} />
              </Td>
              <Td></Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.engaged || 0) * v.baseRate), 0)} />
              </Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.risk || 0) * v.baseRate), 0)} />
              </Td>
              <Td></Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default OptionsPositions;
