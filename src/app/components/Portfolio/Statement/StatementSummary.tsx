import { Box, Link, Spacer, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { StatementsSynthesysEntries, SynthesysEntry } from "../../../../routers/statements.types";
import BarChart from "../../Chart/BarChart";
import Number from "../../Number/Number";

type StatementSummaryProps = Record<string, never>;

const StatementSummary: FunctionComponent<StatementSummaryProps> = ({ ..._rest }): React.ReactNode => {
  // const [theSynthesys, setSynthesys] = useState({} as StatementsSynthesysEntries);
  // useEffect(() => {
  //   fetch(`/api/portfolio/${portfolioId}/statements`)
  //     .then((response) => response.json())
  //     .then((data) => setSynthesys(data.data));
  // }, []);
  const theSynthesys = useLoaderData() as StatementsSynthesysEntries;

  return (
    <>
      <Box>
        <Spacer />
        <Link to={"../ytd"} as={RouterLink}>
          YTD
        </Link>
        {" | "}
        <Link to={"../12m"} as={RouterLink}>
          12M
        </Link>
        {" | "}
        <Link to={"../all"} as={RouterLink}>
          All
        </Link>
        {/* <Routes>
          <Route index element={"All"} /> |
          <Route path="/YTD" element={"YTD"} /> |
          <Route path="/12M" element={"12M"} />
        </Routes> */}
        <Spacer />
      </Box>
      <BarChart
        title="Realized Performance"
        labels={Object.keys(theSynthesys)}
        options_pnl={Object.values(theSynthesys).map((item) => Math.round(item.options))}
        dividends={Object.values(theSynthesys).map((item) => Math.round(item.dividends))}
        stocks_pnl={Object.values(theSynthesys).map((item) => Math.round(item.stocks))}
      />
      <TableContainer>
        <Table variant="simple" size="sm">
          <TableCaption>Realized Performance ({Object.keys(theSynthesys).length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Month</Td>
              <Td>Options</Td>
              <Td>Stocks</Td>
              <Td>Dividends</Td>
              <Td>Interests</Td>
              <Td>Total</Td>
            </Tr>
          </Thead>
          <Tbody>
            {Object.keys(theSynthesys)
              .sort((a: string, b: string) => b.localeCompare(a))
              .map((key) => (
                <Tr key={key}>
                  <Td>
                    <Link to={`../../month/${key.substring(0, 4)}/${key.substring(5)}`} as={RouterLink}>
                      {key}
                    </Link>
                  </Td>
                  <Td isNumeric>
                    <Number value={theSynthesys[key].options} />
                  </Td>
                  <Td isNumeric>
                    <Number value={theSynthesys[key].stocks} />
                  </Td>
                  <Td isNumeric>
                    <Number value={theSynthesys[key].dividends} />
                  </Td>
                  <Td isNumeric>
                    <Number value={theSynthesys[key].interests} />
                  </Td>
                  <Td isNumeric>
                    <Number value={theSynthesys[key].total} />
                  </Td>
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr fontWeight="bold">
              <Td>Total</Td>
              <Td isNumeric>
                <Number
                  value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.options || 0), 0)}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.stocks || 0), 0)}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={Object.values(theSynthesys).reduce(
                    (p: number, v: SynthesysEntry) => (p += v.dividends || 0),
                    0,
                  )}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={Object.values(theSynthesys).reduce(
                    (p: number, v: SynthesysEntry) => (p += v.interests || 0),
                    0,
                  )}
                />
              </Td>
              <Td isNumeric>
                <Number
                  value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.total || 0), 0)}
                />
              </Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default StatementSummary;
