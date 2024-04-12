import { SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import React from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";
import { obfuscate } from "../../utils";
import { StatementLink } from "./Statement/links";

const PortfolioIndex = (): React.ReactNode => {
  const portfolios = useLoaderData() as PortfolioModel[];

  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <TableCaption>Portfolio index ({portfolios.length})</TableCaption>
        <Thead>
          <Tr>
            <Td>#</Td>
            <Td>Name</Td>
            <Td>Account</Td>
            <Td>Currency</Td>
            <Td>Action</Td>
          </Tr>
        </Thead>
        <Tbody>
          {portfolios.map((item) => (
            <Tr key={item.id}>
              <Td>{item.id}</Td>
              <Td>{item.name}</Td>
              <Td>{obfuscate(item.account)}</Td>
              <Td>{item.baseCurrency}</Td>
              <Td>
                <Link to={StatementLink.toIndex(item.id)} as={RouterLink}>
                  <IconButton aria-label="Show detail" icon={<SearchIcon />} size="xs" variant="ghost" />{" "}
                </Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default PortfolioIndex;
