import { Table, chakra } from "@chakra-ui/react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";
import { LuChevronDown as TriangleDownIcon, LuChevronUp as TriangleUpIcon } from "react-icons/lu";

export interface DataTableProps<Data extends object> {
  data: Data[];
  columns: ColumnDef<Data, any>[];
  title?: string;
}

export function DataTable<Data extends object>({ data, columns, title }: DataTableProps<Data>): React.JSX.Element {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <Table.Root variant="line" size="sm" className="table-tiny">
      <Table.Caption>
        {title || "index"} ({data.length})
      </Table.Caption>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <Table.ColumnHeader key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <chakra.span pl="4">
                    {header.column.getIsSorted() ? (
                      header.column.getIsSorted() === "desc" ? (
                        <TriangleDownIcon aria-label="sorted descending" className="inline" />
                      ) : (
                        <TriangleUpIcon aria-label="sorted ascending" className="inline" />
                      )
                    ) : null}
                  </chakra.span>
                </Table.ColumnHeader>
              );
            })}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id}>
            {row.getVisibleCells().map((cell) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = cell.column.columnDef.meta;
              return (
                <Table.Cell key={cell.id} textAlign={meta?.isNumeric ? "end" : "start"}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              );
            })}
          </Table.Row>
        ))}
      </Table.Body>
      <Table.Footer>
        {table.getFooterGroups().map((footerGroup) => (
          <Table.Row key={footerGroup.id}>
            {footerGroup.headers.map((header) => {
              // see https://tanstack.com/table/v8/docs/api/core/column-def#meta to type this correctly
              const meta: any = header.column.columnDef.meta;
              return (
                <Table.Header key={header.id} alignContent={meta?.isNumeric ? "end" : "start"}>
                  {flexRender(header.column.columnDef.footer, header.getContext())}
                </Table.Header>
              );
            })}
          </Table.Row>
        ))}
      </Table.Footer>
    </Table.Root>
  );
}
