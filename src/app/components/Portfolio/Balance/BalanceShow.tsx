import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { FaArrowLeft as ArrowBackIcon, FaTrashCan as DeleteIcon, FaPencil as EditIcon } from "react-icons/fa6";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/balances.types";
import Number from "../../Number/Number";

type Props = Record<string, never>;

const BalanceShow: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const item = useLoaderData() as BalanceEntry;
  const navigate = useNavigate();

  // console.log(item);
  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Balance Id:
          </Text>
          <Text w="200px" textAlign="right">
            {item.id}
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
            Balance:
          </Text>
          <Number w="200px" textAlign="right" value={item.quantity} decimals={2} />
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
            <RouterLink to="edit">
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
    </>
  );
};

export default BalanceShow;
