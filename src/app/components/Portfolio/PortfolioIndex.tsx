import { Link, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import React from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { Portfolio as PortfolioModel } from "../../../models/portfolio.model";
import { obfuscate } from "../../utils";

/**
 * Load portfolio list content
 * @param param0
 * @returns
 */
export const loader = ({ params }): Promise<PortfolioModel[]> => {
  const { portfolioId, year, month } = params;
  return fetch("/api/portfolio")
    .then((response) => response.json())
    .then((data) => data.portfolios);
};

const PortfolioIndex = (): JSX.Element => {
  // const [portfolios, setPortfolios] = useState([] as PortfolioModel[]);
  const portfolios = useLoaderData() as PortfolioModel[];

  // useEffect(() => {
  //   fetch("/api/portfolio")
  //     .then((response) => response.json())
  //     .then((data) => setPortfolios(data.data));
  // }, []);

  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <TableCaption>Portfolio index ({portfolios.length})</TableCaption>
        <Thead>
          <Tr>
            <Td>Name</Td>
            <Td>Account</Td>
            <Td>Currency</Td>
          </Tr>
        </Thead>
        <Tbody>
          {portfolios.map((item) => (
            <Tr key={item.id}>
              <Td>
                <Link to={`${item.id}`} as={RouterLink}>
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
