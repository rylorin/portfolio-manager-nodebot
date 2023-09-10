import { ArrowUpIcon, DeleteIcon, EditIcon, QuestionOutlineIcon, SearchIcon, SmallCloseIcon } from "@chakra-ui/icons";
import { IconButton, Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { PositionLink } from "./links";

type Props = {
  title?: string;
  content?: PositionEntry[];
};

/**
 * Statements list component
 * @param param
 * @returns
 */
const PositionsTable: FunctionComponent<Props> = ({
  title = "Positions index",
  content,
  ..._rest
}): React.JSX.Element => {
  const { portfolioId } = useParams();
  const thePositions = content || (useLoaderData() as PositionEntry[]);
  let previousId: number;

  const savePrevious = (value: number): undefined => {
    if (value) previousId = value;
    return undefined;
  };

  const underlyingSymbol = (pos: PositionEntry | OptionPositionEntry): string => {
    switch (pos.contract.secType) {
      case ContractType.Stock:
        return pos.contract.symbol;
      case ContractType.Future:
        return pos.contract.symbol;
      case ContractType.Option:
        return (pos as OptionPositionEntry).underlying
          ? (pos as OptionPositionEntry).underlying.symbol
          : pos.contract.symbol;
      default:
        return pos.contract.symbol;
    }
  };

  const comparePositions = (a: PositionEntry | OptionPositionEntry, b: PositionEntry | OptionPositionEntry): number => {
    const aSymbol = underlyingSymbol(a);
    const bSymbol = underlyingSymbol(b);
    let result: number = aSymbol.localeCompare(bSymbol);
    if (result == 0) {
      // Same underlying symbol, Options displayed after Stocks and Futures
      if (a.contract.secType == ContractType.Stock && b.contract.secType != ContractType.Stock) result = -1;
      else if (a.contract.secType !== ContractType.Stock && b.contract.secType == ContractType.Stock) result = 1;
      else if (a.contract.secType == ContractType.Option && b.contract.secType == ContractType.Option) {
        // sort Options by expiration
        result = (a as OptionPositionEntry).option.expiration.localeCompare(
          (b as OptionPositionEntry).option.expiration,
        );
        // sort Options with same expiration by strike
        if (result == 0) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
      }
    }
    return result;
  };

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>
            {title} ({thePositions.length})
          </TableCaption>
          <Thead>
            <Tr>
              <Td>Units</Td>
              <Td>Symbol</Td>
              <Td>Name</Td>
              <Td>Trade</Td>
              <Td>Curr.</Td>
              <Td>Price</Td>
              <Td>Value</Td>
              <Td>PRU</Td>
              <Td>Cost</Td>
              <Td>PNL</Td>
              <Td>PNL%</Td>
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {thePositions.sort(comparePositions).map((item) => (
              <Tr key={item.id}>
                <Td isNumeric>{formatNumber(item.quantity)}</Td>
                <Td>
                  <Link to={ContractLink.toItem(portfolioId, item.contract.id)} as={RouterLink}>
                    {item.contract.symbol}
                  </Link>
                </Td>
                <Td>{item.contract.name}</Td>
                <Td isNumeric>
                  {item.trade_id && (
                    <>
                      <Link to={`/portfolio/${portfolioId}/trades/id/${item.trade_id}`} as={RouterLink}>
                        {item.trade_id}
                      </Link>
                      <Form method="post" action={`${item.id}/PositionUnlinkTrade`} className="inline">
                        <IconButton
                          aria-label="Remove trade association"
                          icon={<SmallCloseIcon />}
                          size="xs"
                          variant="ghost"
                          type="submit"
                        />
                      </Form>
                    </>
                  )}
                  {!item.trade_id && (
                    <>
                      <Form method="post" action={`PositionGuessTrade/${item.id}`} className="inline">
                        <IconButton
                          aria-label="Guess trade"
                          icon={<QuestionOutlineIcon />}
                          size="xs"
                          variant="ghost"
                          type="submit"
                        />
                      </Form>
                      {previousId && (
                        <Form method="post" action={`PositionAddToTrade/${item.id}/${previousId}`} className="inline">
                          <IconButton
                            aria-label="Copy above trade"
                            icon={<ArrowUpIcon />}
                            size="xs"
                            variant="ghost"
                            type="submit"
                          />
                        </Form>
                      )}
                    </>
                  )}
                </Td>
                <Td>{item.contract.currency}</Td>
                <Td isNumeric>{formatNumber(item.price, 2)}</Td>
                <Td isNumeric>{formatNumber(item.value)}</Td>
                <Td isNumeric>{formatNumber(item.pru, 2)}</Td>
                <Td isNumeric>{formatNumber(item.cost)}</Td>
                <Td isNumeric>
                  <Number value={item.pnl} />
                </Td>
                <Td isNumeric>
                  <Number value={(item.pnl / item.cost) * Math.sign(item.quantity)} decimals={1} isPercent />
                </Td>
                <Td>
                  <RouterLink to={`${PositionLink.toItem(portfolioId, item.id)}`}>
                    <IconButton aria-label="Show position" icon={<SearchIcon />} size="xs" variant="ghost" />
                  </RouterLink>
                  <RouterLink to={`${PositionLink.editItem(portfolioId, item.id)}`}>
                    <IconButton aria-label="Edit position" icon={<EditIcon />} size="xs" variant="ghost" />
                  </RouterLink>
                  <Form method="post" action={`DeletePosition/${item.id}`} className="inline">
                    <IconButton
                      aria-label="Delete position"
                      icon={<DeleteIcon />}
                      size="xs"
                      variant="ghost"
                      type="submit"
                    />
                  </Form>
                  {savePrevious(item.trade_id)}
                </Td>
              </Tr>
            ))}
          </Tbody>
          <Tfoot>
            <Tr fontWeight="bold">
              <Td>Total</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td>Base</Td>
              <Td></Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.value || 0) * v.baseRate), 0)} />
              </Td>
              <Td></Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.cost || 0) * v.baseRate), 0)} />
              </Td>
              <Td isNumeric>
                <Number value={thePositions.reduce((p, v) => (p += (v.value - v.cost || 0) * v.baseRate), 0)} />
              </Td>
              <Td></Td>
              <Td></Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default PositionsTable;
