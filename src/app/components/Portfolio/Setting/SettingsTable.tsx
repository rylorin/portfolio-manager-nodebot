import { SettingEntry } from "@/routers";
import { IconButton, Link, Table, TableCaption } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { FaSearch as SearchIcon } from "react-icons/fa";
import { FaTrashCan as DeleteIcon, FaPencil as EditIcon } from "react-icons/fa6";
import { RiAddCircleLine as PlusSquareIcon } from "react-icons/ri";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { cspStrategy2String, strategy2String } from "../../../../models/setting.types";
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
  const theSettings = (content || (useLoaderData() as SettingEntry[])).sort((a, b) =>
    a.underlying.symbol.localeCompare(b.underlying.symbol),
  );

  return (
    <>
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>Settings index ({theSettings.length})</TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Symbol</Table.Cell>
            <Table.Cell>Lookup</Table.Cell>
            <Table.Cell>Prem.</Table.Cell>
            <Table.Cell>CSP strat.</Table.Cell>
            <Table.Cell>Ratio</Table.Cell>
            <Table.Cell>CSP delta</Table.Cell>
            <Table.Cell>CSP Roll</Table.Cell>
            <Table.Cell>CC strat.</Table.Cell>
            <Table.Cell>CC delta</Table.Cell>
            <Table.Cell>CC Roll</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {theSettings
            .sort((a, b) => a.underlying.symbol.localeCompare(b.underlying.symbol))
            .map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>{item.underlying.symbol}</Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.lookupDays} color="-" />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.minPremium} decimals={2} color="-" />
                </Table.Cell>
                <Table.Cell>{cspStrategy2String(item.cspStrategy)}</Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.navRatio} isPercent color="-" />
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.cspDelta} decimals={2} color="-" />
                </Table.Cell>
                <Table.Cell>{strategy2String(item.rollPutStrategy)}</Table.Cell>
                <Table.Cell>{strategy2String(item.ccStrategy)}</Table.Cell>
                <Table.Cell textAlign="end">
                  <Number value={item.ccDelta} decimals={2} color="-" />
                </Table.Cell>
                <Table.Cell>{strategy2String(item.rollCallStrategy)}</Table.Cell>

                <Table.Cell>
                  <Link asChild>
                    <RouterLink to={SettingLink.toSetting(portfolioId, item.id)}>
                      <IconButton aria-label="Show setting" size="xs" variant="ghost">
                        <SearchIcon />
                      </IconButton>
                    </RouterLink>
                  </Link>
                  <Link asChild>
                    <RouterLink to={SettingLink.toSettingEdit(portfolioId, item.id)}>
                      <IconButton aria-label="Edit setting" size="xs" variant="ghost">
                        <EditIcon />
                      </IconButton>
                    </RouterLink>
                  </Link>
                  <Form method="post" action={SettingLink.toSettingDelete(portfolioId, item.id)} className="inline">
                    <IconButton aria-label="Delete setting" size="xs" variant="ghost" type="submit">
                      <DeleteIcon />
                    </IconButton>
                  </Form>
                </Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row>
            <Table.Cell fontWeight="bold">Total</Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={theSettings.reduce((p, item) => (p += item.navRatio), 0)}
                isPercent
                fontWeight="bold"
                color="-"
              />
            </Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell>
              <Link asChild>
                <RouterLink to={SettingLink.toSettingNew(portfolioId)}>
                  <IconButton aria-label="Add setting" size="xs" variant="ghost">
                    <PlusSquareIcon />
                  </IconButton>
                </RouterLink>
              </Link>
            </Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </>
  );
};

export default SettingsTable;
