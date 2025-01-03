import { Box, Link, Spacer, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { OptionPositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import OptionRow from "./OptionRow";
import SubTotalRow, { TotalEntry } from "./SubTotalRow";

type ItemRowType = OptionPositionEntry | TotalEntry;

type PositionsIndexProps = Record<string, never>;

interface DataRowProps {
  portfolioId: number;
  item: ItemRowType;
}

/**
 * Statements list component
 * @param param0
 * @returns
 */
const OptionsPositions: FunctionComponent<PositionsIndexProps> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const thePositions = useLoaderData() as OptionPositionEntry[];

  const compareItems = (a: OptionPositionEntry, b: OptionPositionEntry): number => {
    let result: number;
    if (!a && !b) return 0;
    else if (!a) return -1;
    else if (!b) return 1;
    result = a.option.expiration.localeCompare(b.option.expiration);
    if (!result) {
      result = a.option.symbol.localeCompare(b.option.symbol);
      if (!result) result = a.option.strike - b.option.strike;
    }
    return result;
  };

  const getPositions = (positions: OptionPositionEntry[]): ItemRowType[] => {
    const result: ItemRowType[] = [];
    let subTotal: TotalEntry;

    positions
      .filter((item) => item.quantity)
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
        subTotal.engaged += item.engaged < 0 ? item.engaged * item.baseRate : 0;
        subTotal.risk += item.risk < 0 ? item.risk * item.baseRate : 0;
        subTotal.pnl += item.pnl * item.baseRate;
        // console.log(subTotal);
        result.push(item);
      });
    if (subTotal) result.push(subTotal);
    return result;
  };

  const DataRow: FunctionComponent<DataRowProps> = ({ portfolioId, item, ..._rest }): React.ReactNode => {
    if ("option" in item) return <OptionRow item={item} portfolioId={portfolioId} />;
    else return <SubTotalRow subTotal={item} />;
  };

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
          <TableCaption>
            Statements index ({thePositions.reduce((p, item) => ("option" in item ? p + 1 : p), 0 as number)})
          </TableCaption>
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
              <DataRow portfolioId={parseInt(portfolioId)} item={item} key={item.id} />
            ))}
          </Tbody>
          <Tfoot>
            <Tr fontWeight="bold">
              <Td isNumeric>{formatNumber(thePositions.reduce((p, v) => p + Math.abs(v.quantity), 0))}</Td>
              <Td></Td>
              <Td></Td>
              <Td>Total</Td>
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
                <Number value={thePositions.reduce((p, v) => (p += v.engaged < 0 ? v.engaged * v.baseRate : 0), 0)} />
              </Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += v.risk < 0 ? v.risk * v.baseRate : 0), 0)} />
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
