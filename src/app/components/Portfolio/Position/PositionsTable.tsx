import { ArrowUpIcon, DeleteIcon, EditIcon, QuestionOutlineIcon, SearchIcon, SmallCloseIcon } from "@chakra-ui/icons";
import { IconButton, Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { PositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { PositionLink } from "./links";

type Props = { content?: PositionEntry[] };

/**
 * Statements list component
 * @param param
 * @returns
 */
const PositionsTable: FunctionComponent<Props> = ({ content, ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const thePositions = content || (useLoaderData() as PositionEntry[]);
  let previousId: number;

  const savePrevious = (value: number): undefined => {
    if (value) previousId = value;
    return undefined;
  };

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Positions index ({thePositions.length})</TableCaption>
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
            {thePositions
              .sort((a, b) => a.contract.symbol.localeCompare(b.contract.symbol))
              .map((item) => (
                <Tr key={item.id}>
                  <Td isNumeric>{formatNumber(item.quantity)}</Td>
                  <Td>
                    <Link to={ContractLink.toItem(portfolioId, item.contract.id)} as={RouterLink}>
                      {item.contract.symbol}
                    </Link>
                  </Td>
                  <Td>{item.contract.name}</Td>
                  <Td>
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
                    <Form method="post" action={`${PositionLink.toItem(portfolioId, item.id)}`} className="inline">
                      <IconButton
                        aria-label="Show position"
                        icon={<SearchIcon />}
                        size="xs"
                        variant="ghost"
                        type="submit"
                      />
                    </Form>
                    <IconButton aria-label="Edit position" icon={<EditIcon />} size="xs" variant="ghost" />
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
