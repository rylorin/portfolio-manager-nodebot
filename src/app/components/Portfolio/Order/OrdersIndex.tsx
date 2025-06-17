import { IconButton, Table, TableCaption } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { FaTrashCan as DeleteIcon } from "react-icons/fa6";
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
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>
          {title} ({theOrders.length})
        </TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Id</Table.Cell>
            <Table.Cell>Action</Table.Cell>
            <Table.Cell>Total Qty</Table.Cell>
            <Table.Cell>Symbol</Table.Cell>
            <Table.Cell>Status</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {theOrders.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell textAlign="end">{item.id}</Table.Cell>
              <Table.Cell>{item.actionType}</Table.Cell>
              <Table.Cell>{item.totalQty}</Table.Cell>
              <Table.Cell>{item.contract.symbol}</Table.Cell>
              <Table.Cell>{item.status}</Table.Cell>
              <Table.Cell>
                <Form method="post" action={`DeleteOrder/${item.id}`} className="inline">
                  <IconButton aria-label="Delete order" size="xs" variant="ghost" type="submit">
                    <DeleteIcon />
                  </IconButton>
                </Form>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </>
  );
};

export default OrdersIndex;
