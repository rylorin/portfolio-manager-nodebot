import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Center, Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Link as RouterLink, useLoaderData, useNavigate } from "react-router-dom";
import { PositionEntry } from "../../../../routers/positions.types";

type Props = Record<string, never>;

const ShowOption: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const thisItem = useLoaderData() as PositionEntry;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Option Id:
          </Text>
          <Text w="200px" textAlign="right">
            {thisItem.id}
          </Text>
        </Flex>

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton aria-label="Back" icon={<ArrowBackIcon />} variant="ghost" onClick={(): void => navigate(-1)} />
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
      </VStack>
    </>
  );
};

export default ShowOption;
