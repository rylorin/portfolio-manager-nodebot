import { IconButton, Link, Table, TableCaption } from "@chakra-ui/react";
import React from "react";
import { FaSearch as SearchIcon } from "react-icons/fa";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";
import { obfuscate } from "../../utils";
import { ReportLink } from "./Report/links";

const PortfolioIndex = (): React.ReactNode => {
  const portfolios = useLoaderData() as PortfolioModel[];

  return (
    <Table.Root variant="line" size="sm">
      <TableCaption>Portfolio index ({portfolios.length})</TableCaption>
      <Table.Header>
        <Table.Row>
          <Table.Cell>#</Table.Cell>
          <Table.Cell>Name</Table.Cell>
          <Table.Cell>Account</Table.Cell>
          <Table.Cell>Currency</Table.Cell>
          <Table.Cell>Action</Table.Cell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {portfolios.map((item) => (
          <Table.Row key={item.id}>
            <Table.Cell>{item.id}</Table.Cell>
            <Table.Cell>{item.name}</Table.Cell>
            <Table.Cell>{obfuscate(item.account)}</Table.Cell>
            <Table.Cell>{item.baseCurrency}</Table.Cell>
            <Table.Cell>
              <Link asChild>
                <RouterLink to={ReportLink.toIndex(item.id)}>
                  <IconButton aria-label="Show detail" size="xs" variant="ghost">
                    <SearchIcon />
                  </IconButton>
                </RouterLink>
              </Link>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};

export default PortfolioIndex;
