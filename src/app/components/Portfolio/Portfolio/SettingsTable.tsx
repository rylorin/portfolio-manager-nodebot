import { DeleteIcon, EditIcon, SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { Setting } from "../../../../models/setting.model";
import Number from "../../Number/Number";
import { PortfolioLink } from "./links";

type Props = { content?: Setting[] };

/**
 * Statements list component
 * @param param
 * @returns
 */
const SettingsTable: FunctionComponent<Props> = ({ content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
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
              <Td>Actions</Td>
            </Tr>
          </Thead>
          <Tbody>
            {theSettings
              .sort((a, b) => a.underlying.symbol.localeCompare(b.underlying.symbol))
              .map((item) => (
                <Tr key={item.id}>
                  <Td>{item.underlying.symbol}</Td>
                  <Td isNumeric>
                    <Number value={item.navRatio} decimals={1} isPercent color="-" />
                  </Td>
                  <Td>
                    <Link to={PortfolioLink.toSetting(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Show setting" icon={<SearchIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Link to={PortfolioLink.toSettingEdit(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Edit setting" icon={<EditIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Form method="post" action={`DeleteSetting/${item.id}`} className="inline">
                      <IconButton
                        aria-label="Delete setting"
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        type="submit"
                      />
                    </Form>
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
