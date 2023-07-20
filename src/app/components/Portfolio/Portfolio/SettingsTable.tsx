import { Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { useLoaderData } from "react-router-dom";
import { Setting } from "../../../../models/setting.model";
import Number from "../../Number/Number";

type Props = { content?: Setting[] };

/**
 * Statements list component
 * @param param
 * @returns
 */
const SettingsTable: FunctionComponent<Props> = ({ content, ..._rest }): JSX.Element => {
  const theSettings = content || (useLoaderData() as Setting[]);

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Settings index ({theSettings.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Symbol</Td>
              <Td>NAV Ratio</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theSettings
              .sort((a, b) => a.contract.symbol.localeCompare(b.contract.symbol))
              .map((item) => (
                <Tr key={item.id}>
                  <Td>{item.contract.symbol}</Td>
                  <Td isNumeric>
                    <Number value={item.navRatio} decimals={1} isPercent />
                  </Td>
                </Tr>
              ))}
          </Tbody>
          <Tfoot>
            <Tr>
              <Td fontWeight="bold">Total</Td>
              <Td isNumeric>
                <Number value={theSettings.reduce((p, item) => (p += item.navRatio), 0)} isPercent fontWeight="bold" />
              </Td>
              <Td></Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default SettingsTable;
