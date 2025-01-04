import { SettingEntry } from "@/routers";
import { DeleteIcon, EditIcon, PlusSquareIcon, SearchIcon } from "@chakra-ui/icons";
import { IconButton, Link, Table, TableCaption, TableContainer, Tbody, Td, Tfoot, Thead, Tr } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { strategy2String } from "../../../../models/setting.types";
import Number from "../../Number/Number";
import { SettingLink } from "./links";

interface Props {
  content?: SettingEntry[];
}

/**
 * Statements list component
 * @param param
 * @returns
 */
const SettingsTable: FunctionComponent<Props> = ({ content, ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theSettings = content || (useLoaderData() as SettingEntry[]);

  return (
    <>
      <TableContainer>
        <Table variant="simple" size="sm" className="table-tiny">
          <TableCaption>Settings index ({theSettings.length})</TableCaption>
          <Thead>
            <Tr>
              <Td>Symbol</Td>
              <Td>Lookup</Td>
              <Td>NAV Ratio</Td>
              <Td>Prem.</Td>
              <Td>CSP strat.</Td>
              <Td>CSP Roll</Td>
              <Td>CC strat.</Td>
              <Td>CC delta</Td>
              <Td>CC Roll</Td>
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
                    <Number value={item.lookupDays} color="-" />
                  </Td>
                  <Td isNumeric>
                    <Number value={item.navRatio} isPercent color="-" />
                  </Td>
                  <Td isNumeric>
                    <Number value={item.minPremium} decimals={2} color="-" />
                  </Td>
                  <Td>{strategy2String(item.cspStrategy)}</Td>
                  <Td>{strategy2String(item.rollPutStrategy)}</Td>
                  <Td>{strategy2String(item.ccStrategy)}</Td>
                  <Td isNumeric>
                    <Number value={item.ccDelta} decimals={2} color="-" />
                  </Td>
                  <Td>{strategy2String(item.rollCallStrategy)}</Td>

                  <Td>
                    <Link to={SettingLink.toSetting(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Show setting" icon={<SearchIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Link to={SettingLink.toSettingEdit(portfolioId, item.id)} as={RouterLink}>
                      <IconButton aria-label="Edit setting" icon={<EditIcon />} size="xs" variant="ghost" />
                    </Link>
                    <Form method="post" action={SettingLink.toSettingDelete(portfolioId, item.id)} className="inline">
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
              <Td></Td>
              <Td isNumeric>
                <Number
                  value={theSettings.reduce((p, item) => (p += item.navRatio), 0)}
                  isPercent
                  fontWeight="bold"
                  color="-"
                />
              </Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td></Td>
              <Td>
                <Link to={SettingLink.toSettingNew(portfolioId)} as={RouterLink}>
                  <IconButton aria-label="Add setting" icon={<PlusSquareIcon />} size="xs" variant="ghost" />
                </Link>
              </Td>
            </Tr>
          </Tfoot>
        </Table>
      </TableContainer>
    </>
  );
};

export default SettingsTable;
