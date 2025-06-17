import { IconButton, Table, TableCaption } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { FaSearch as SearchIcon } from "react-icons/fa";
import { FaTrashCan as DeleteIcon, FaPencil as EditIcon } from "react-icons/fa6";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/balances.types";
import Number from "../../Number/Number";
import { BalanceLink } from "./links";

type BalancesIndexProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const BalancesIndex: FunctionComponent<BalancesIndexProps> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theBalances = useLoaderData() as BalanceEntry[];

  return (
    <>
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>Statements index ({theBalances.length})</TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Curr.</Table.Cell>
            <Table.Cell>Quantity</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {theBalances
            .sort((a, b) => a.currency.localeCompare(b.currency))
            .map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>{item.currency}</Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.quantity} decimals={2} />
                </Table.Cell>
                <Table.Cell>
                  <RouterLink to={`${BalanceLink.toItem(portfolioId, item.id)}`}>
                    <IconButton aria-label="Show Balance" size="xs" variant="ghost">
                      <SearchIcon />
                    </IconButton>
                  </RouterLink>
                  <IconButton aria-label="Edit Balance" size="xs" variant="ghost">
                    <EditIcon />
                  </IconButton>
                  <Form method="post" action={`DeleteBalance/${item.id}`} className="inline">
                    <IconButton aria-label="Delete balance" size="xs" variant="ghost" type="submit">
                      <DeleteIcon />
                    </IconButton>
                  </Form>
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell fontWeight="bold">Total</Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={theBalances.reduce((p, item) => (p += (item.quantity || 0) * item.baseRate), 0)}
                fontWeight="bold"
              />
            </Table.Cell>
            <Table.Cell></Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </>
  );
};

export default BalancesIndex;
