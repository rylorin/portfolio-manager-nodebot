import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Flex, Text, VStack } from "@chakra-ui/layout";
import { IconButton } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
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
          NAV Ratio:
        </Text>
        <Number textAlign="left" w="120px" value={thisItem.navRatio} isPercent color={"-"} />
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
          CSP Roll:
        </Text>
        <Text textAlign="left" w="120px">
          {strategy2String(thisItem.rollPutStrategy)}
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
    </VStack>
  );
};

export default SettingShow;
