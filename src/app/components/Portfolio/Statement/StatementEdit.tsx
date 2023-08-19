import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Link, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import { FunctionComponent, default as React } from "react";
import {
  Form as RouterForm,
  Link as RouterLink,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from "react-router-dom";
import { StatementEntry } from "../../../../routers/statements.types";
import { ContractLink } from "../Contract/links";

type Props = Record<string, never>;

/**
 * Statements list component
 * @param param Component properties
 * @returns
 */
const StatementEdit: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const { portfolioId } = useParams();
  const theStatement = useLoaderData() as StatementEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={theStatement}
      onSubmit={(values, _actions): void => {
        // console.log("submit values", values);
        submit(
          values,
          // {
          //   ...values,
          // Select values are returned as string, therefore we have to convert them to numbers, if needed
          //   status: parseInt(values.status as unknown as string),
          //   strategy: parseInt(values.strategy as unknown as string),
          // },
          { method: "post" },
        );
      }}
    >
      {(formik: FormikProps<StatementEntry>): JSX.Element => {
        return (
          <RouterForm method="post" onSubmit={formik.handleSubmit}>
            <VStack>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Statement Id:
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
                  Trade:
                </Text>
                <Text w="200px">
                  <Field name="trade_id" type="number" />
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
              {theStatement.underlying && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Underlying:
                  </Text>
                  <Text w="200px" textAlign="right">
                    <Link to={ContractLink.toItem(portfolioId, theStatement.underlying.id)} as={RouterLink}>
                      {theStatement.underlying.symbol}
                    </Link>
                  </Text>
                </Flex>
              )}
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Type:
                </Text>
                <Text w="200px" textAlign="right">
                  {theStatement.statementType}
                </Text>
              </Flex>

              <Flex justifyContent="center" gap="2" mt="1">
                <IconButton
                  aria-label="Back"
                  icon={<ArrowBackIcon />}
                  variant="ghost"
                  onClick={(): void => navigate(-1)}
                />
                <IconButton aria-label="Save" icon={<CheckIcon />} variant="ghost" type="submit" />
              </Flex>
            </VStack>
          </RouterForm>
        );
      }}
    </Formik>
  );
};

export default StatementEdit;
