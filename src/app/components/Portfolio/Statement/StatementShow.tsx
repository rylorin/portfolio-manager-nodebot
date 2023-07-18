import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Link, Text, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { Statement } from "../../../../models/statement.model";
import { ContractLink } from "../Contract/links";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param Component properties
 * @returns
 */
const StatementShow: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const theStatement = useLoaderData() as Statement;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Trade Id:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.id}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Transaction:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.transactionId}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Date:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.date.toLocaleString()}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Currency:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.currency}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Fx Rate:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.fxRateToBase}
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Underlying:
          </Text>
          <Text w="200px" textAlign="right">
            <Link to={ContractLink.toItem(portfolioId, theStatement.stock.id)} as={RouterLink}>
              {theStatement.stock.symbol}
            </Link>
          </Text>
        </Flex>
        <Flex justifyContent="center" gap="2">
          <Text w="90px" as="b" textAlign="right">
            Type:
          </Text>
          <Text w="200px" textAlign="right">
            {theStatement.statementType}
          </Text>
        </Flex>

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton aria-label="Back" icon={<ArrowBackIcon />} variant="ghost" onClick={(): void => navigate(-1)} />
          <IconButton aria-label="Edit" icon={<EditIcon />} variant="ghost" as={RouterLink} to="edit" />
          <Form method="post" action="delete" className="inline">
            <IconButton aria-label="Delete" icon={<DeleteIcon />} variant="ghost" type="submit" />
          </Form>
        </Flex>
      </VStack>
    </>
  );
};

export default StatementShow;
