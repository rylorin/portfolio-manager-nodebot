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
import { StatementEntry } from "../../../../routers/statements.types";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { TradeLink } from "../Trade/links";
import { StatementLink } from "./links";

type Props = { content?: StatementEntry[]; currency?: string };

/**
 * Statements list component
 * @param param
 * @returns
 */
const StatementsTable: FunctionComponent<Props> = ({ content, currency, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theStatements = content || (useLoaderData() as StatementEntry[]);
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
              <Td>Amount</Td>
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
                      <Link to={StatementLink.toItem(portfolioId, item.id)} as={RouterLink}>
                        {new Date(item.date).toLocaleDateString()}
                      </Link>
                    </Tooltip>
                  </Td>
                  <Td>
                    <Tooltip label={item.fxRateToBase} placement="auto" hasArrow={true}>
                      {item.currency}
                    </Tooltip>
                  </Td>
                  <Td isNumeric>
                    <Number value={item.amount} decimals={2} />
                  </Td>
                  <Td isNumeric>
                    <Number value={item.pnl} decimals={2} />
                  </Td>
                  <Td isNumeric>
                    <Number value={item.fees} decimals={2} />
                  </Td>
                  <Td>
                    {item.underlying && (
                      <Link to={ContractLink.toItem(portfolioId, item.underlying.id)} as={RouterLink}>
                        {item.underlying.symbol}
                      </Link>
                    )}
                  </Td>
                  <Td>
                    {item.trade_id && (
                      <>
                        <Link to={TradeLink.toItem(portfolioId, item.trade_id)} as={RouterLink}>
                          {item.trade_id}
                        </Link>
                        <Form method="post" action={`StatementUnlinkTrade/${item.id}`} className="inline">
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
                    {item.underlying && !item.trade_id && (
                      <>
                        <Form method="post" action={`StatementCreateTrade/${item.id}`} className="inline">
                          <IconButton
                            aria-label="New trade"
                            icon={<PlusSquareIcon />}
                            size="xs"
                            variant="ghost"
                            type="submit"
                          />
                        </Form>
                        <Form method="post" action={`StatementGuessTrade/${item.id}`} className="inline">
                          <IconButton
                            aria-label="Guess trade"
                            icon={<QuestionOutlineIcon />}
                            size="xs"
                            variant="ghost"
                            type="submit"
                          />
                        </Form>
                        {previousId && (
                          <Form
                            method="post"
                            action={`StatementAddToTrade/${item.id}/${previousId}`}
                            className="inline"
                          >
                            <IconButton
                              aria-label="Above trade"
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
                  <Td>{item.description}</Td>
                  <Td>
                    <Link to={StatementLink.toItem(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Show detail" icon={<SearchIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Link to={StatementLink.edit(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Edit details" icon={<EditIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Form method="post" action={`DeleteStatement/${item.id}`} className="inline">
                      <IconButton
                        aria-label="Delete statement"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        type="submit"
                      />
                    </Form>
                  </Td>
                  {savePrevious(item.trade_id)}
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr fontWeight="bold">
              <Td>Total</Td>
              <Td>{currency ?? "Base"}</Td>
              <Td isNumeric>
                <Number
                  value={theStatements.reduce(
                    (p: number, item) =>
                      (p += (item.amount || 0) * (currency ? (currency == item.currency ? 1 : 0) : item.fxRateToBase)),
                    0,
                  )}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={theStatements.reduce(
                    (p: number, item) =>
                      (p += (item.pnl || 0) * (currency ? (currency == item.currency ? 1 : 0) : item.fxRateToBase)),
                    0,
                  )}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={theStatements.reduce(
                    (p: number, item) =>
                      (p += (item.fees || 0) * (currency ? (currency == item.currency ? 1 : 0) : item.fxRateToBase)),
                    0,
                  )}
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

export default StatementsTable;
