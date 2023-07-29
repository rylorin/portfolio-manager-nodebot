import { DeleteIcon, EditIcon, SearchIcon } from "@chakra-ui/icons";
import { IconButton, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, useLoaderData } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/balances.types";
import Number from "../../Number/Number";

type BalancesIndexProps = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const BalancesIndex: FunctionComponent<BalancesIndexProps> = ({ ..._rest }): JSX.Element => {
  const theBalances = useLoaderData() as BalanceEntry[];

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Statements index ({theBalances.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Curr.</Td>
              <Td>Quantity</Td>
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theBalances
              .sort((a, b) => a.currency.localeCompare(b.currency))
              .map((item) => (
                <Tr key={item.id}>
                  <Td>{item.currency}</Td>
                  <Td>
                    <Number value={item.quantity} decimals={2} />
                  </Td>
                  <Td>
                    <IconButton aria-label="New trade" icon={<SearchIcon />} size="xs" variant="ghost" />
                    <IconButton aria-label="Guess trade" icon={<EditIcon />} size="xs" variant="ghost" />
                    <Form method="post" action={`DeleteBalance/${item.id}`} className="inline">
                      <IconButton
                        aria-label="Delete balance"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        type="submit"
                      />
                    </Form>
                  </Td>
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td fontWeight="bold">Total</Td>
              <Td>
                <Number
                  value={theBalances.reduce((p, item) => (p += (item.quantity || 0) * item.baseRate), 0)}
                  fontWeight="bold"
                />
              </Td>
              <Td></Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default BalancesIndex;
