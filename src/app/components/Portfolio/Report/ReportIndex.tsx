import { Link, Table, TableCaption, TableContainer, Tbody, Td, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ReportLink } from "./links";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param0
 * @returns
 */
const ReportsIndex: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theReports = useLoaderData() as number[];

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>TableCaption</TableCaption>
          <Thead>
            <Tr>
              <Td>Year</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theReports.map((item) => (
              <Tr key={item}>
                <td>
                  <Link to={ReportLink.toItem(portfolioId, item)} as={RouterLink}>
                    {item}
                  </Link>
                </td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ReportsIndex;
