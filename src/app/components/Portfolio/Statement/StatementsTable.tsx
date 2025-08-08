import { IconButton, Link, Table, TableCaption } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import {
  LuCircleArrowUp as ArrowUpIcon,
  LuTrash2 as DeleteIcon,
  LuPencil as EditIcon,
  LuSquarePlus as PlusSquareIcon,
  LuFileQuestion as QuestionOutlineIcon,
  LuSearch as SearchIcon,
  LuCircleMinus as SmallCloseIcon,
} from "react-icons/lu";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { StatementEntry } from "../../../../routers/statements.types";
import Number from "../../Number/Number";
import { Tooltip } from "../../ui/tooltip";
import { ContractLink } from "../Contract/links";
import { TradeLink } from "../Trade/links";
import { StatementLink } from "./links";
import StatementsExport from "./StatementsExport";

interface Props {
  content?: StatementEntry[];
  currency?: string;
  title?: string;
}

/**
 * Statements list component
 * @param param
 * @returns
 */
const StatementsTable: FunctionComponent<Props> = ({ content, currency, title, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theStatements = content || (useLoaderData() as StatementEntry[]);

  let previousId: number;

  let currencyMismatch = false;
  let totalFees = 0;
  let totalFeesInCurrency = 0;
  let totalAmount = 0;
  let totalAmountInCurrency = 0;
  let totalPnL = 0;
  let totalPnLInCurrency = 0;

  const savePrevious = (item: StatementEntry): undefined => {
    if (item.trade_id) previousId = item.trade_id;
    currencyMismatch = item.currency == currency ? currencyMismatch : true;
    totalAmount += item.amount * item.fxRateToBase;
    totalAmountInCurrency += item.amount;
    if ("fees" in item) {
      totalFees += item.fees * item.fxRateToBase;
      totalFeesInCurrency += item.fees;
    }
    if ("pnl" in item) {
      totalPnL += item.pnl * item.fxRateToBase;
      totalPnLInCurrency += item.pnl;
    }
    return undefined;
  };

  return (
    <>
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>
          {title || "Statements index"} ({theStatements.length})
        </TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Date</Table.Cell>
            <Table.Cell>Curr.</Table.Cell>
            <Table.Cell>Amount</Table.Cell>
            <Table.Cell>PnL</Table.Cell>
            <Table.Cell>Fees</Table.Cell>
            <Table.Cell>Under.</Table.Cell>
            <Table.Cell>Trade</Table.Cell>
            <Table.Cell>Description</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {theStatements
            .sort((a: StatementEntry, b: StatementEntry) => a.date - b.date)
            .map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>
                  <Tooltip content={new Date(item.date).toLocaleTimeString()} showArrow>
                    <Link asChild>
                      <RouterLink to={StatementLink.toItem(portfolioId, item.id)}>
                        {new Date(item.date).toLocaleDateString()}
                      </RouterLink>
                    </Link>
                  </Tooltip>
                </Table.Cell>
                <Table.Cell>
                  <Tooltip content={item.fxRateToBase} showArrow>
                    {item.currency}
                  </Tooltip>
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.amount} decimals={2} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={"pnl" in item ? item.pnl : 0} decimals={2} />
                </Table.Cell>
                <Table.Cell textAlign="end">{"fees" in item && <Number value={item.fees} decimals={2} />}</Table.Cell>
                <Table.Cell>
                  {"underlying" in item && item.underlying && (
                    <Link asChild>
                      <RouterLink to={ContractLink.toItem(portfolioId, item.underlying.id)}>
                        {item.underlying.symbol}
                      </RouterLink>
                    </Link>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {item.trade_id && (
                    <>
                      <Link asChild>
                        <RouterLink to={TradeLink.toItem(portfolioId, item.trade_id)}>{item.trade_id}</RouterLink>
                      </Link>
                      <Form method="post" action={`StatementUnlinkTrade/${item.id}`} className="inline">
                        <IconButton aria-label="Remove trade association" size="xs" variant="ghost" type="submit">
                          <SmallCloseIcon />
                        </IconButton>
                      </Form>
                    </>
                  )}
                  {"underlying" in item && !item.trade_id && (
                    <>
                      <Form method="post" action={`StatementCreateTrade/${item.id}`} className="inline">
                        <IconButton aria-label="New trade" size="xs" variant="ghost" type="submit">
                          <PlusSquareIcon />
                        </IconButton>
                      </Form>
                      <Form method="post" action={`StatementGuessTrade/${item.id}`} className="inline">
                        <IconButton aria-label="Guess trade" size="xs" variant="ghost" type="submit">
                          <QuestionOutlineIcon />
                        </IconButton>
                      </Form>
                      {previousId && (
                        <Form method="post" action={`StatementAddToTrade/${item.id}/${previousId}`} className="inline">
                          <IconButton aria-label="Above trade" size="xs" variant="ghost" type="submit">
                            <ArrowUpIcon />
                          </IconButton>
                        </Form>
                      )}
                    </>
                  )}
                </Table.Cell>
                <Table.Cell>{item.description}</Table.Cell>
                <Table.Cell>
                  <RouterLink to={StatementLink.toItem(portfolioId, item.id)}>
                    <IconButton aria-label="Show detail" size="xs" variant="ghost">
                      <SearchIcon />
                    </IconButton>
                  </RouterLink>
                  <RouterLink to={StatementLink.edit(portfolioId, item.id)}>
                    <IconButton aria-label="Edit details" size="xs" variant="ghost">
                      <EditIcon />
                    </IconButton>
                  </RouterLink>
                  <Form method="post" action={`DeleteStatement/${item.id}`} className="inline">
                    <IconButton aria-label="Delete statement" size="xs" variant="ghost" type="submit">
                      <DeleteIcon />
                    </IconButton>
                  </Form>
                </Table.Cell>
                {savePrevious(item)}
              </Table.Row>
            ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row fontWeight="bold">
            <Table.Cell>Total</Table.Cell>
            <Table.Cell>{currencyMismatch ? "Base" : currency}</Table.Cell>
            <Table.Cell textAlign="end">
              <Number value={currencyMismatch ? totalAmount : totalAmountInCurrency} />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number value={currencyMismatch ? totalPnL : totalPnLInCurrency} />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number value={currencyMismatch ? totalFees : totalFeesInCurrency} />
            </Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
      <StatementsExport content={content} />
    </>
  );
};

export default StatementsTable;
