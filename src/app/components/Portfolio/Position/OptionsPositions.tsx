import {
  Box,
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
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { OptionPositionEntry } from "../../../../routers/types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import OptionRow from "./OptionRowContent";
import SubTotalRow, { TotalEntry } from "./SubTotalRowContent";

type PositionsIndexProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const OptionsPositions: FunctionComponent<PositionsIndexProps> = ({ ..._rest }): JSX.Element => {
  const bg = useColorModeValue("gray.200", "gray.900");
  const thePositions = useLoaderData() as OptionPositionEntry[];

  const compareItems = (a: OptionPositionEntry, b: OptionPositionEntry): number => {
    let result;
    result = a.option.expiration.localeCompare(b.option.expiration);
    if (!result) {
      result = a.option.symbol.localeCompare(b.option.symbol);
      if (!result) result = a.option.strike - b.option.strike;
    }
    return result;
  };

  const getPositions = (positions: OptionPositionEntry[]): (OptionPositionEntry | TotalEntry)[] => {
    const result: (OptionPositionEntry | TotalEntry)[] = [];
    let subTotal: TotalEntry;

    positions
      .sort((a, b) => compareItems(a, b))
      .forEach((item) => {
        if (!subTotal) {
          subTotal = {
            id: item.option.expiration,
            expiration: item.option.expiration,
            units: 0,
            cost: 0,
            value: 0,
            engaged: 0,
            risk: 0,
            pnl: 0,
          };
        } else if (item.option.expiration != subTotal.expiration) {
          // new expiration, emit subtotal
          result.push(subTotal);
          subTotal = {
            id: item.option.expiration,
            expiration: item.option.expiration,
            units: 0,
            cost: 0,
            value: 0,
            engaged: 0,
            risk: 0,
            pnl: 0,
          };
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
        result.push(item);
      });
    if (subTotal) result.push(subTotal);
    return result;
  };

  // const ItemRow() :JSX.Element=> {

  // }

  const positions = getPositions(thePositions);
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
            {positions.map((item) => (
              <Tr key={`${item.id}`} id={`${item.id}`} bg={item["option"] ? undefined : bg}>
                {item["option"] ? (
                  <OptionRow item={item as OptionPositionEntry} />
                ) : (
                  <SubTotalRow subTotal={item as TotalEntry} />
                )}
              </Tr>
            ))}
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
