import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Link, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { TradeStatus } from "../../../../models/trade.types";
import { PositionEntry } from "../../../../routers/positions.types";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import PositionsTable from "../Position/PositionsTable";
import StatementsTable from "../Statement/StatementsTable";
import { StatementLink } from "../Statement/links";
import { tradeStatus2String, tradeStrategy2String } from "./utils";

type Props = Record<string, never>;

const TradeShow: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const item = useLoaderData() as TradeEntry;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Trade Id:
          </Text>
          <Text w="200px" textAlign="right">
            {item.id}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Open date:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={StatementLink.toDate(portfolioId, new Date(item.openingDate))} as={RouterLink}>
              {new Date(item.openingDate).toLocaleString()}
            </Link>
          </Text>
        </Flex>
        {item.expectedExpiry && (
          <>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Expiry date:
              </Text>
              <Text w="200px" textAlign="right">
                {new Date(item.expectedExpiry).toLocaleDateString()}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Exp. Duration:
              </Text>
              <Text w="200px" textAlign="right">
                {formatNumber(item.expectedDuration)}
              </Text>
            </Flex>
          </>
        )}
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Close date:
          </Text>
          <Text w="200px" textAlign="right">
            {item.closingDate && (
              <Link to={StatementLink.toDate(portfolioId, new Date(item.closingDate))} as={RouterLink}>
                {new Date(item.closingDate).toLocaleString()}
              </Link>
            )}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Duration:
          </Text>
          <Text w="200px" textAlign="right">
            {formatNumber(item.duration)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Status:
          </Text>
          <Text w="200px" textAlign="right">
            {tradeStatus2String(item.status)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Strategy:
          </Text>
          <Text w="200px" textAlign="right">
            {tradeStrategy2String(item.strategy)} ({item.strategy})
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Symbol:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={ContractLink.toItem(portfolioId, item.underlying.id)} as={RouterLink}>
              {item.underlying.symbol}
            </Link>
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Currency:
          </Text>
          <Text w="200px" textAlign="right">
            {item.currency}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Risk:
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={item.risk} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            P&L:
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={item.PnL} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            P&L (Base):
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={item.pnlInBase} />
          </Text>
        </Flex>
        {item.status != TradeStatus.closed && (
          <>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Exp. P&L:
              </Text>
              <Text w="200px" textAlign="right">
                <Number value={item.expiryPnl} />
              </Text>
            </Flex>
          </>
        )}
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            APY:
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={item.apy} isPercent decimals={1} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Notes:
          </Text>
          <Text w="200px">{item.comment}</Text>
        </Flex>

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton
            aria-label="Back"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
          />
          <IconButton aria-label="Edit" icon={<EditIcon />} variant="ghost" as={RouterLink} to="edit" />
          <Form method="post" action="delete" className="inline">
            <IconButton aria-label="Delete" icon={<DeleteIcon />} variant="ghost" type="submit" />
          </Form>
        </Flex>
        {item.positions?.length && <PositionsTable content={item.positions} currency={item.currency} />}
        {item.statements?.length && <StatementsTable content={item.statements} currency={item.currency} />}
        {item.virtuals?.length && (
          <PositionsTable
            content={item.virtuals.filter((pos) => pos.quantity) as PositionEntry[]}
            title="Virtual positions"
            currency={item.currency}
          />
        )}
      </VStack>
    </>
  );
};

export default TradeShow;
