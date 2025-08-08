import { IconButton, Link, Table, TableCaption } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import {
  LuCircleArrowUp as ArrowUpIcon,
  LuTrash2 as DeleteIcon,
  LuPencil as EditIcon,
  LuFileQuestion as QuestionOutlineIcon,
  LuSearch as SearchIcon,
  LuCircleMinus as SmallCloseIcon,
} from "react-icons/lu";
import { Form, Link as RouterLink, useLoaderData, useParams } from "react-router-dom";
import { ContractType } from "../../../../models/contract.types";
import { OptionPositionEntry, PositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { PositionLink } from "./links";
import { comparePositions } from "./utils";

interface Props {
  title?: string;
  content?: PositionEntry[];
  currency?: string;
}

/**
 * Positions list component
 * @param param
 * @returns
 */
const PositionsTable: FunctionComponent<Props> = ({
  title = "Positions index",
  content,
  currency,
  ..._rest
}): React.ReactNode => {
  const { portfolioId } = useParams();
  const thePositions = content || (useLoaderData() as PositionEntry[]);
  let previousId: number;

  const savePrevious = (value: number): undefined => {
    if (value) previousId = value;
    return undefined;
  };

  const _underlyingSymbol = (pos: PositionEntry | OptionPositionEntry): string => {
    switch (pos.contract.secType) {
      case ContractType.Stock:
        return pos.contract.symbol;
      case ContractType.Future:
        return pos.contract.symbol;
      case ContractType.Option:
        return (pos as OptionPositionEntry).underlying
          ? (pos as OptionPositionEntry).underlying.symbol
          : pos.contract.symbol;
      default:
        return pos.contract.symbol;
    }
  };

  const _comparePositions = (
    a: PositionEntry | OptionPositionEntry,
    b: PositionEntry | OptionPositionEntry,
  ): number => {
    const aSymbol = _underlyingSymbol(a);
    const bSymbol = _underlyingSymbol(b);
    let result: number = aSymbol.localeCompare(bSymbol);
    if (result == 0) {
      // Same underlying symbol, Options displayed after Stocks and Futures
      if (a.contract.secType == ContractType.Stock && b.contract.secType != ContractType.Stock) result = -1;
      else if (a.contract.secType !== ContractType.Stock && b.contract.secType == ContractType.Stock) result = 1;
      else if (a.contract.secType == ContractType.Option && b.contract.secType == ContractType.Option) {
        // sort Options by expiration
        result = (a as OptionPositionEntry).option.expiration.localeCompare(
          (b as OptionPositionEntry).option.expiration,
        );
        // sort Options with same expiration by strike
        if (result == 0) result = (a as OptionPositionEntry).option.strike - (b as OptionPositionEntry).option.strike;
      }
    }
    return result;
  };

  const getUnderlyingId = (a: PositionEntry | OptionPositionEntry): number => {
    let result: number;
    switch (a.contract.secType) {
      case ContractType.Stock:
      case ContractType.Bond:
        result = a.contract.id;
        break;
      case ContractType.Option:
        result = (a as OptionPositionEntry).underlying?.id;
        break;
    }
    return result;
  };

  return (
    <>
      <Table.Root variant="line" size="sm" className="table-tiny">
        <TableCaption>
          {title} ({thePositions.length})
        </TableCaption>
        <Table.Header>
          <Table.Row>
            <Table.Cell>Units</Table.Cell>
            <Table.Cell>Symbol</Table.Cell>
            <Table.Cell>Name</Table.Cell>
            <Table.Cell>Trade</Table.Cell>
            <Table.Cell>Curr.</Table.Cell>
            <Table.Cell>Price</Table.Cell>
            <Table.Cell>Value</Table.Cell>
            <Table.Cell>PRU</Table.Cell>
            <Table.Cell>Cost</Table.Cell>
            <Table.Cell>PNL</Table.Cell>
            <Table.Cell>PNL%</Table.Cell>
            <Table.Cell>Actions</Table.Cell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {thePositions.sort(comparePositions).map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell textAlign="end">{formatNumber(item.quantity)}</Table.Cell>
              <Table.Cell>
                <Link asChild>
                  <RouterLink to={ContractLink.toItem(portfolioId, getUnderlyingId(item))}>
                    {item.contract.symbol}
                  </RouterLink>
                </Link>
              </Table.Cell>
              <Table.Cell>{item.contract.name}</Table.Cell>
              <Table.Cell textAlign="end">
                {item.trade_unit_id && (
                  <>
                    <Link asChild>
                      <RouterLink to={`/portfolio/${portfolioId}/trades/id/${item.trade_unit_id}`}>
                        {item.trade_unit_id}
                      </RouterLink>
                    </Link>
                    <Form method="post" action={`${item.id}/PositionUnlinkTrade`} className="inline">
                      <IconButton aria-label="Remove trade association" size="xs" variant="ghost" type="submit">
                        <SmallCloseIcon />
                      </IconButton>
                    </Form>
                  </>
                )}
                {!item.trade_unit_id && (
                  <>
                    <Form method="post" action={`PositionGuessTrade/${item.id}`} className="inline">
                      <IconButton aria-label="Guess trade" size="xs" variant="ghost" type="submit">
                        <QuestionOutlineIcon />
                      </IconButton>
                    </Form>
                    {previousId && (
                      <Form method="post" action={`PositionAddToTrade/${item.id}/${previousId}`} className="inline">
                        <IconButton aria-label="Copy above trade" size="xs" variant="ghost" type="submit">
                          <ArrowUpIcon />
                        </IconButton>
                      </Form>
                    )}
                  </>
                )}
              </Table.Cell>
              <Table.Cell>{item.contract.currency}</Table.Cell>
              <Table.Cell textAlign="end">{formatNumber(item.price, 2)}</Table.Cell>
              <Table.Cell textAlign="end">{formatNumber(item.value)}</Table.Cell>
              <Table.Cell textAlign="end">{formatNumber(item.pru, 2)}</Table.Cell>
              <Table.Cell textAlign="end">{formatNumber(item.cost)}</Table.Cell>
              <Table.Cell textAlign="end">
                <Number value={item.pnl} />
              </Table.Cell>
              <Table.Cell textAlign="end">
                <Number value={(item.pnl / item.cost) * Math.sign(item.quantity)} decimals={1} isPercent />
              </Table.Cell>
              <Table.Cell>
                <RouterLink to={`${PositionLink.toItem(portfolioId, item.id)}`}>
                  <IconButton aria-label="Show position" size="xs" variant="ghost">
                    <SearchIcon />
                  </IconButton>
                </RouterLink>
                <RouterLink to={`${PositionLink.editItem(portfolioId, item.id)}`}>
                  <IconButton aria-label="Edit position" size="xs" variant="ghost">
                    <EditIcon />
                  </IconButton>
                </RouterLink>
                <Form method="post" action={`DeletePosition/${item.id}`} className="inline">
                  <IconButton aria-label="Delete position" size="xs" variant="ghost" type="submit">
                    <DeleteIcon />
                  </IconButton>
                </Form>
                {savePrevious(item.trade_unit_id)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        <Table.Footer>
          <Table.Row fontWeight="bold">
            <Table.Cell textAlign="end">
              <Number value={thePositions.reduce((p, v) => (p += v.quantity), 0)} />
            </Table.Cell>
            <Table.Cell>Total</Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell>{currency ?? "Base"}</Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={thePositions.reduce(
                  (p, v) => (p += (v.value || 0) * (currency ? (currency == v.contract.currency ? 1 : 0) : v.baseRate)),
                  0,
                )}
              />
            </Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={thePositions.reduce(
                  (p, v) => (p += (v.cost || 0) * (currency ? (currency == v.contract.currency ? 1 : 0) : v.baseRate)),
                  0,
                )}
              />
            </Table.Cell>
            <Table.Cell textAlign="end">
              <Number
                value={thePositions.reduce(
                  (p, v) =>
                    (p +=
                      (v.value - v.cost || 0) * (currency ? (currency == v.contract.currency ? 1 : 0) : v.baseRate)),
                  0,
                )}
              />
            </Table.Cell>
            <Table.Cell></Table.Cell>
            <Table.Cell></Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table.Root>
    </>
  );
};

export default PositionsTable;
