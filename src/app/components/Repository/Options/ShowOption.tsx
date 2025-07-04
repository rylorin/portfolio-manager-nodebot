import { Center, Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { FaArrowLeft as ArrowBackIcon, FaTrashCan as DeleteIcon, FaPencil as EditIcon } from "react-icons/fa6";
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
          <IconButton
            aria-label="Back"
            variant="ghost"
            onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
          >
            <ArrowBackIcon />
          </IconButton>
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
