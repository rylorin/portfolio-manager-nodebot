import {
  ArrowUpIcon,
  DeleteIcon,
  EditIcon,
  PlusSquareIcon,
  QuestionOutlineIcon,
  SearchIcon,
  SmallCloseIcon,
} from "@chakra-ui/icons";
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
} from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { PositionEntry } from "../../../../routers/types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type PositionsIndexProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const PositionsIndex: FunctionComponent<PositionsIndexProps> = ({ ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const thePositions = useLoaderData() as PositionEntry[];
  let previousId: number;

  const savePrevious = (value: number): undefined => {
    if (value) previousId = value;
    return undefined;
  };

  // const getPrice = (item: Position) => {
  //   return item.contract.price || (item.contract.ask + item.contract.bid) / 2 || item.contract.previousClosePrice;
  // };

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
                  <Td>{item.contract.symbol}</Td>
                  <Td>{item.contract.name}</Td>
                  <Td>
                    {item.trade_id && (
                      <>
                        <Link to={`../${portfolioId}/trade/${item.trade_id}`} as={RouterLink}>
                          {item.trade_id}
                        </Link>
                        <IconButton
                          aria-label="Remove trade association"
                          icon={<SmallCloseIcon />}
                          size="xs"
                          variant="link"
                        />
                      </>
                    )}
                    {!item.trade_id && (
                      <>
                        <Form method="post" action={`CreateTrade/${item.id}`} className="inline">
                          <IconButton
                            aria-label="New trade"
                            icon={<PlusSquareIcon />}
                            size="xs"
                            variant="link"
                            type="submit"
                          />
                        </Form>
                        <Form method="post" action={`GuessTrade/${item.id}`} className="inline">
                          <IconButton
                            aria-label="Guess trade"
                            icon={<QuestionOutlineIcon />}
                            size="xs"
                            variant="ghost"
                            type="submit"
                          />
                        </Form>
                        {previousId && (
                          <Form method="post" action={`AddToTrade/${item.id}/tradeId/${previousId}`} className="inline">
                            <IconButton
                              aria-label="Above trade"
                              icon={<ArrowUpIcon />}
                              size="xs"
                              variant="link"
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
                  <Td>
                    <Number value={item.pnl} />
                  </Td>
                  <Td>
                    <Number value={(item.pnl / item.cost) * 100 * Math.sign(item.quantity)} decimals={1} />
                  </Td>
                  <Td>
                    <IconButton aria-label="New trade" icon={<SearchIcon />} size="xs" variant="link" />
                    <IconButton aria-label="Guess trade" icon={<EditIcon />} size="xs" variant="ghost" />
                    <IconButton aria-label="Above trade" icon={<DeleteIcon />} size="xs" variant="link" />
                    {savePrevious(item.trade_id)}
                  </Td>
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td fontWeight="bold">Total</Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td>Base</Td>
              <Td></Td>
              <Td>
                <Number
                  value={thePositions.reduce((p, v) => (p += (v.value || 0) * v.baseRate), 0)}
                  fontWeight="bold"
                />
              </Td>
              <Td></Td>
              <Td>
                <Number value={thePositions.reduce((p, v) => (p += (v.cost || 0) * v.baseRate), 0)} fontWeight="bold" />
              </Td>
              <Td>
                <Number
                  value={thePositions.reduce((p, v) => (p += (v.value - v.cost || 0) * v.baseRate), 0)}
                  fontWeight="bold"
                />
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

export default PositionsIndex;
