import { DeleteIcon } from "@chakra-ui/icons";
import { IconButton, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, useLoaderData, useParams } from "react-router-dom";
import { OrderEntry } from "../../../../routers/";
import { ordersIndexLoader } from "./loaders";

interface Props {
  title?: string;
  content?: OrderEntry[];
  currency?: string;
}

/**
 * Positions list component
 * @param param
 * @returns
 */
const OrdersIndex: FunctionComponent<Props> = ({ title = "Orders index", content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const theOrders = content ?? useLoaderData<typeof ordersIndexLoader>();

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>
            {title} ({theOrders.length})
          </TableCaption>
          <Thead>
            <Tr>
              <Td>Id</Td>
              <Td>Action</Td>
              <Td>Total Qty</Td>
              <Td>Symbol</Td>
              <Td>Status</Td>
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theOrders.map((item) => (
              <Tr key={item.id}>
                <Td isNumeric>{item.id}</Td>
                <Td>{item.actionType}</Td>
                <Td>{item.totalQty}</Td>
                <Td>{item.contract.symbol}</Td>
                <Td>{item.status}</Td>
                <Td>
                  <Form method="post" action={`DeleteOrder/${item.id}`} className="inline">
                    <IconButton
                      aria-label="Delete order"
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
        </Table>
      </TableContainer>
    </>
  );
};

export default OrdersIndex;
