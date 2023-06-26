import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Center, Flex, Text } from "@chakra-ui/layout";
import React, { FunctionComponent } from "react";
import { Link as RouterLink, useLoaderData } from "react-router-dom";
import { Position as PositionModel } from "../../../../models";

type PositionShowProps = Record<string, never>;

const PositionShow: FunctionComponent<PositionShowProps> = ({ ..._rest }): JSX.Element => {
  const thisPosition = useLoaderData() as PositionModel;

  return (
    <>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Id:
        </Text>
        <Text textAlign="left" w="120px">
          Position {thisPosition.id}
        </Text>
      </Flex>
      {/* <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Name:
        </Text>
         <Text w="120px" textAlign="left">
          {thisPosition.name}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Account:
        </Text>
        <Text w="120px" textAlign="left">
          {obfuscate(thisPosition.account)}
        </Text>
      </Flex> */}
      {/* <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Currency:
        </Text>
        <Text w="120px" textAlign="left">
          {thisPosition.baseCurrency}
        </Text>
      </Flex> */}
      <Flex justifyContent="center" gap="2" mt="1">
        <RouterLink to="edit">
          <Center w="40px" h="40px">
            <EditIcon />
          </Center>
        </RouterLink>
        <RouterLink to="delete_but_edit">
          <Center w="40px" h="40px">
            <DeleteIcon />
          </Center>
        </RouterLink>
      </Flex>
    </>
  );
};

export default PositionShow;
