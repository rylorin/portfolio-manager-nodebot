import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Center, Flex, IconButton, Link, Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { PositionEntry } from "../../../../routers/positions.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { ContractLink } from "../Contract/links";
import { TradeLink } from "../Trade/links";
import { PositionLink } from "./links";

type PositionShowProps = Record<string, never>;

const PositionShow: FunctionComponent<PositionShowProps> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const thisPosition = useLoaderData() as PositionEntry;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Position Id:
          </Text>
          <Text w="200px" textAlign="right">
            {thisPosition.id}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Date:
          </Text>
          <Text w="200px" textAlign="right">
            {new Date(thisPosition.openDate).toLocaleDateString()}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Symbol:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={ContractLink.toItem(portfolioId, thisPosition.contract.id)} as={RouterLink}>
              {thisPosition.contract.symbol}
            </Link>
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Quantity:
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={thisPosition.quantity} decimals={2} />
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Cost:
          </Text>
          <Text w="200px" textAlign="right">
            {formatNumber(thisPosition.cost, 2)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            PRU:
          </Text>
          <Text w="200px" textAlign="right">
            {formatNumber(thisPosition.pru, 2)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Value:
          </Text>
          <Text w="200px" textAlign="right">
            {formatNumber(thisPosition.value, 2)}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            P/L:
          </Text>
          <Text w="200px" textAlign="right">
            <Number value={thisPosition.pnl} decimals={2} />
          </Text>
        </Flex>
        {"engaged" in thisPosition && (
          <Flex justifyContent="center" gap="2">
            <Text w="90px" as="b" textAlign="right">
              Engaged:
            </Text>
            <Text w="200px" textAlign="right">
              <Number value={thisPosition.engaged as number} decimals={2} />
            </Text>
          </Flex>
        )}
        {"risk" in thisPosition && (
          <Flex justifyContent="center" gap="2">
            <Text w="90px" as="b" textAlign="right">
              Risk:
            </Text>
            <Text w="200px" textAlign="right">
              <Number value={thisPosition.risk as number} decimals={2} />
            </Text>
          </Flex>
        )}
        {"apy" in thisPosition && (
          <Flex justifyContent="center" gap="2">
            <Text w="90px" as="b" textAlign="right">
              APY:
            </Text>
            <Text w="200px" textAlign="right">
              <Number value={thisPosition.apy as number} decimals={2} isPercent />
            </Text>
          </Flex>
        )}
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Trade:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={TradeLink.toItem(portfolioId, thisPosition.trade_unit_id)} as={RouterLink}>
              {thisPosition.trade_unit_id}
            </Link>
          </Text>
        </Flex>

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton
            aria-label="Back"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
          />
          <RouterLink to={`${PositionLink.editItem(portfolioId, thisPosition.id)}`}>
            <IconButton aria-label="Edit position" icon={<EditIcon />} variant="ghost" type="submit" />
          </RouterLink>
          <RouterLink to="delete_but_edit">
            <Center w="40px" h="40px">
              <DeleteIcon />
            </Center>
          </RouterLink>
        </Flex>
      </VStack>
    </>
  );
};

export default PositionShow;
