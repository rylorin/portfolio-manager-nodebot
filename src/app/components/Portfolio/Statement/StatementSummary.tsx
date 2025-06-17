import { Box, Link, Spacer, Table, TableCaption } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { StatementsSynthesysEntries, SynthesysEntry } from "../../../../routers/statements.types";
import BarChart, { DataSet } from "../../Chart/BarChart";
import Number from "../../Number/Number";

type StatementSummaryProps = Record<string, never>;

const StatementSummary: FunctionComponent<StatementSummaryProps> = ({ ..._rest }): React.ReactNode => {
  const theSynthesys = useLoaderData() as StatementsSynthesysEntries;

  const datasets: DataSet[] = [
    { label: "Stocks", data: Object.values(theSynthesys).map((item) => Math.round(item.stocks)) },
    {
      label: "Options",
      data: Object.values(theSynthesys).map((item) => Math.round(item.options)),
    },
    {
      label: "Div+Int",
      data: Object.values(theSynthesys).map((item) => Math.round(item.dividends + item.interests)),
    },
  ];

  return (
    <>
      <Box>
        <Spacer />
        <Link asChild>
          <RouterLink to="../ytd">YTD</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to="../12m">12M</RouterLink>
        </Link>
        {" | "}
        <Link asChild>
          <RouterLink to="../all">All</RouterLink>
        </Link>
        {/* <Routes>
          <Route index element={"All"} /> |
          <Route path="/YTD" element={"YTD"} /> |
          <Route path="/12M" element={"12M"} />
        </Routes> */}
        <Spacer />
      </Box>
      <BarChart title="Realized Performance" labels={Object.keys(theSynthesys)} datasets={datasets} />
      <Table.Root variant="outline" size="sm">
        <TableCaption>Realized Performance ({Object.keys(theSynthesys).length})</TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Month</Table.Cell>
            <Table.Cell>Options</Table.Cell>
            <Table.Cell>Stocks</Table.Cell>
            <Table.Cell>Dividends</Table.Cell>
            <Table.Cell>Interests</Table.Cell>
            <Table.Cell>Total</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Object.keys(theSynthesys)
            .sort((a: string, b: string) => b.localeCompare(a))
            .map((key) => (
              <Table.Row key={key}>
                <Table.Cell>
                  <Link asChild>
                    <RouterLink to={`../../month/${key.substring(0, 4)}/${key.substring(5)}`}>{key}</RouterLink>
                  </Link>
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={theSynthesys[key].options} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={theSynthesys[key].stocks} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={theSynthesys[key].dividends} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={theSynthesys[key].interests} />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={theSynthesys[key].total} />
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row fontWeight="bold">
            <Table.Cell>Total</Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.options || 0), 0)}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.stocks || 0), 0)}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.dividends || 0), 0)}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.interests || 0), 0)}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={Object.values(theSynthesys).reduce((p: number, v: SynthesysEntry) => (p += v.total || 0), 0)}
              />
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </>
  );
};

export default StatementSummary;
