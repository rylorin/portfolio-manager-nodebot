import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Flex, Text, VStack } from "@chakra-ui/layout";
import { IconButton } from "@chakra-ui/react";
import React, { FunctionComponent } from "react";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { settingLoader } from "./loaders";

type SettingShowProps = Record<string, never>;

const SettingShow: FunctionComponent<SettingShowProps> = ({ ..._rest }): React.ReactNode => {
  const { setting: thisItem } = useLoaderData<typeof settingLoader>();
  const navigate = useNavigate();
  const { _portfolioId } = useParams();

  return (
    <VStack>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Setting Id:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.id}
        </Text>
      </Flex>
      <Flex justifyContent="center" gap="2">
        <Text w="90px" as="b" textAlign="right">
          Symbol:
        </Text>
        <Text textAlign="left" w="120px">
          {thisItem.underlying.symbol}
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
