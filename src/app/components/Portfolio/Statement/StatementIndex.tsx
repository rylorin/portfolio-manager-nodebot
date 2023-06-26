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
  IconButton,
  Link,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Tfoot,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { StatementEntry } from "../../../../routers/types";
import Number from "../../Number/Number";

type StatementIndexProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const StatementIndex: FunctionComponent<StatementIndexProps> = ({ ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const theStatements = useLoaderData() as StatementEntry[];
  let previousId: number;

  const savePrevious = (value: number): undefined => {
    if (value) previousId = value;
    return undefined;
  };

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Statements index ({theStatements.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Date</Td>
              <Td>Curr.</Td>
              <Td>Proceeds</Td>
              <Td>PnL</Td>
              <Td>Fees</Td>
              <Td>Under.</Td>
              <Td>Trade</Td>
              <Td>Description</Td>
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theStatements
              .sort((a: StatementEntry, b: StatementEntry) => a.date - b.date)
              .map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Tooltip label={new Date(item.date).toLocaleTimeString()} placement="auto" hasArrow={true}>
                      <Link to={`../id/${item.id}`} as={RouterLink}>
                        {new Date(item.date).toLocaleDateString()}
                      </Link>
                    </Tooltip>
                  </Td>
                  <Td>{item.currency}</Td>
                  <Td>
                    <Number value={item.amount} decimals={2} />
                  </Td>
                  <Td>
                    <Number value={item.pnl} decimals={2} />
                  </Td>
                  <Td>
                    <Number value={item.fees} decimals={2} />
                  </Td>
                  <Td>
                    <Link to={`../${portfolioId}/symbol/${item.underlying?.id}`} as={RouterLink}>
                      {item.underlying?.symbol}
                    </Link>
                  </Td>
                  <Td>
                    {item.underlying && item.trade_id && (
                      <>
                        <Link to={`../${portfolioId}/trade/${item.trade_id}`} as={RouterLink}>
                          {item.trade_id}
                        </Link>
                        <Form method="post" action={`UnlinkTrade/${item.id}`} className="inline">
                          <IconButton
                            aria-label="Remove trade association"
                            icon={<SmallCloseIcon />}
                            size="xs"
                            variant="link"
                            type="submit"
                          />
                        </Form>
                      </>
                    )}
                    {item.underlying && !item.trade_id && (
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
                          <Form method="post" action={`AddToTrade/${item.id}/${previousId}`} className="inline">
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
                  <Td>{item.description}</Td>
                  <Td>
                    <IconButton aria-label="New trade" icon={<SearchIcon />} size="xs" variant="link" />
                    <IconButton aria-label="Guess trade" icon={<EditIcon />} size="xs" variant="ghost" />
                    <Form method="post" action={`DeleteStatement/${item.id}`} className="inline">
                      <IconButton
                        aria-label="Delete statement"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="link"
                        type="submit"
                      />
                    </Form>
                  </Td>
                  {savePrevious(item.trade_id)}
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td fontWeight="bold">Total</Td>
              <Td>Base</Td>
              <Td>
                <Number
                  value={theStatements.reduce((p: number, item) => (p += (item.amount || 0) * item.fxRateToBase), 0)}
                  fontWeight="bold"
                />
              </Td>
              <Td>
                <Number
                  value={theStatements.reduce((p: number, item) => (p += (item.pnl || 0) * item.fxRateToBase), 0)}
                  fontWeight="bold"
                />
              </Td>
              <Td>
                <Number
                  value={theStatements.reduce((p: number, item) => (p += (item.fees || 0) * item.fxRateToBase), 0)}
                  fontWeight="bold"
                />
              </Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default StatementIndex;
