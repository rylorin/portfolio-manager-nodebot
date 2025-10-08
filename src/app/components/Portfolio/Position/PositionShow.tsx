import { Center, Flex, IconButton, Link, Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { LuArrowLeft as ArrowBackIcon, LuTrash2 as DeleteIcon, LuPencil as EditIcon } from "react-icons/lu";
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
            <Link asChild>
              <RouterLink to={ContractLink.toItem(portfolioId, thisPosition.contract.id)}>
                {thisPosition.contract.symbol}
              </RouterLink>
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
              APR:
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
            <Link asChild>
              <RouterLink to={TradeLink.toItem(portfolioId, thisPosition.trade_unit_id)}>
                {thisPosition.trade_unit_id}
              </RouterLink>
            </Link>
          </Text>
        </Flex>

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton
            aria-label="Back"
            variant="ghost"
            onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
          >
            <ArrowBackIcon />
          </IconButton>
          <RouterLink to={`${PositionLink.editItem(portfolioId, thisPosition.id)}`}>
            <IconButton aria-label="Edit position" variant="ghost" type="submit">
              <EditIcon />
            </IconButton>
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
