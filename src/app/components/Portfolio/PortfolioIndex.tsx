import { Link, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
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
          </Tr>
        </Thead>
        <Tbody>
          {portfolios.map((item) => (
            <Tr key={item.id}>
              <Td>{item.id}</Td>
              <Td>
                <Link to={StatementLink.toIndex(item.id)} as={RouterLink}>
                  {item.name}
                </Link>
              </Td>
              <Td>{obfuscate(item.account)}</Td>
              <Td>{item.baseCurrency}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default PortfolioIndex;
