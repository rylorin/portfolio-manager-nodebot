import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { FaArrowLeft as ArrowBackIcon, FaTrashCan as DeleteIcon, FaPencil as EditIcon } from "react-icons/fa6";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { cspStrategy2String, strategy2String } from "../../../../models/types";
import Number from "../../Number/Number";
import { settingLoader } from "./loaders";

type SettingShowProps = Record<string, never>;

const SettingShow: FunctionComponent<SettingShowProps> = ({ ..._rest }): React.ReactNode => {
  const { setting: thisItem } = useLoaderData<typeof settingLoader>();
  const navigate = useNavigate();
  const { _portfolioId } = useParams();

  return (
    <VStack>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Setting Id:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.id}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Symbol:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.underlying.symbol}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Lookup days:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.lookupDays}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Premium:
        </Text>
        <Number textAlign="left" w="120px" value={thisItem.minPremium} decimals={2} color={"-"} />
      </Flex>

      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          CSP strat.:
        </Text>
        <Text textAlign="left" w="120px">
          {cspStrategy2String(thisItem.cspStrategy)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          NAV Ratio:
        </Text>
        <Number textAlign="left" w="120px" value={thisItem.navRatio} isPercent color={"-"} />
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          CSP delta:
        </Text>
        <Number textAlign="left" w="120px" value={thisItem.cspDelta} decimals={2} color={"-"} />
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          CSP Roll:
        </Text>
        <Text textAlign="left" w="120px">
          {strategy2String(thisItem.rollPutStrategy)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          CSP Roll days:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.rollPutDays}
        </Text>
      </Flex>

      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Covered calls strat.:
        </Text>
        <Text textAlign="left" w="120px">
          {strategy2String(thisItem.ccStrategy)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Covered calls delta:
        </Text>
        <Number textAlign="left" w="120px" value={thisItem.ccDelta} decimals={2} color={"-"} />
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Covered calls Roll:
        </Text>
        <Text textAlign="left" w="120px">
          {strategy2String(thisItem.rollCallStrategy)}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="180px" as="b" textAlign="right">
          Call Roll days:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.rollCallDays}
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
        <IconButton aria-label="Edit" variant="ghost" asChild>
          <RouterLink to={`edit`}>
            <EditIcon />
          </RouterLink>
        </IconButton>
        <Form method="post" action="delete" className="inline">
          <IconButton aria-label="Delete" variant="ghost" type="submit">
            <DeleteIcon />
          </IconButton>
        </Form>
      </Flex>
    </VStack>
  );
};

export default SettingShow;
