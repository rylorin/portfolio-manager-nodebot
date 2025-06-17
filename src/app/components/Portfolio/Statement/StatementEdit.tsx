// eslint-disable-file @typescript-eslint/no-unsafe-call
import { createListCollection, Flex, IconButton, Link, ListCollection, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import { FunctionComponent, default as React } from "react";
import { FaArrowLeft as ArrowBackIcon, FaCheck as CheckIcon } from "react-icons/fa6";
import {
  Form as RouterForm,
  Link as RouterLink,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from "react-router-dom";
import { StatementTypes } from "../../../../models/statement.types";
import {
  BondStatementEntry,
  InterestStatementEntry,
  StatementEntry,
  TaxStatementEntry,
} from "../../../../routers/statements.types";
import { SelectContent, SelectRoot, SelectTrigger, SelectValueText, toArray } from "../../ui/select";
import { ContractLink } from "../Contract/links";
import { statementTypeToString } from "../Trade/utils";

type Props = Record<string, never>;

type ItemType = { label: string; value: string }; // eslint-disable-line @typescript-eslint/consistent-type-definitions

/**
 * Statements list component
 * @param param Component properties
 * @returns
 */
const StatementEdit: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theStatement = useLoaderData() as StatementEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  const statementTypes: ListCollection = createListCollection<{ label: string; value: string }>({
    items: toArray(StatementTypes),
  });

  const countries: ListCollection = createListCollection<ItemType>({
    items: ["US", "NL", "IE"].map((country) => ({
      label: country,
      value: country,
    })),
  });

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
          { method: "POST" },
        ).catch(() => console.error("Failed to submit data!"));
      }}
    >
      {(formik: FormikProps<StatementEntry>): React.ReactNode => {
        return (
          <RouterForm method="POST" onSubmit={formik.handleSubmit}>
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
              {"underlying" in theStatement && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Underlying:
                  </Text>
                  <Text w="200px" textAlign="right">
                    <Link asChild>
                      <RouterLink to={ContractLink.toItem(portfolioId, theStatement.underlying.id)}>
                        {theStatement.underlying.symbol}
                      </RouterLink>
                    </Link>
                  </Text>
                </Flex>
              )}
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Type:
                </Text>
                <Field name="statementType" w="200px" type="number" variant="outline" as="span" display="inline-flex">
                  <SelectRoot collection={statementTypes} w="200px">
                    <SelectTrigger>
                      <SelectValueText placeholder={statementTypeToString(formik.values.statementType)} />
                    </SelectTrigger>
                    <SelectContent collection={statementTypes} />
                  </SelectRoot>
                </Field>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Description:
                </Text>
                <Text w="200px">
                  <Field name="description" />
                </Text>
              </Flex>

              {/* Bond properties */}
              {theStatement.statementType == StatementTypes.BondStatement && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Country:
                  </Text>
                  <Field
                    as={SelectRoot}
                    name="country"
                    variant="outline"
                    collection={countries}
                    w="200px"
                    onValueChange={(details) => {
                      console.log("country changed to", details);
                      void formik.setFieldValue("country", details.value[0]);
                      // formik.setFieldTouched("status", true, false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder={(formik.values as BondStatementEntry).country} />
                    </SelectTrigger>
                    <SelectContent collection={countries} />
                  </Field>
                </Flex>
              )}

              {/* Interest properties */}
              {theStatement.statementType == StatementTypes.InterestStatement && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Country:
                  </Text>
                  <Field as="span" name="country" variant="outline" w="200px">
                    <SelectRoot
                      name="country"
                      variant="outline"
                      collection={countries}
                      w="200px"
                      onValueChange={(details) => {
                        console.log("country changed to", details);
                        void formik.setFieldValue("country", details.value[0]);
                        // formik.setFieldTouched("status", true, false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder={(formik.values as InterestStatementEntry).country} />
                      </SelectTrigger>
                      <SelectContent collection={countries} />
                    </SelectRoot>
                  </Field>
                </Flex>
              )}

              {/* Tax properties */}
              {theStatement.statementType == StatementTypes.TaxStatement && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Country:
                  </Text>
                  <Field
                    as={SelectRoot}
                    name="country"
                    variant="outline"
                    collection={countries}
                    w="200px"
                    onValueChange={(details) => {
                      console.log("country changed to", details);
                      void formik.setFieldValue("country", details.value[0]);
                      // formik.setFieldTouched("status", true, false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder={(formik.values as TaxStatementEntry).country} />
                    </SelectTrigger>
                    <SelectContent collection={countries} />
                  </Field>
                </Flex>
              )}

              {/* Option properties */}
              {theStatement.statementType == StatementTypes.OptionStatement && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Quantity:
                  </Text>
                  <Field name="quantity" w="200px" />
                </Flex>
              )}

              <Flex justifyContent="center" gap="2" mt="1">
                <IconButton
                  aria-label="Back"
                  variant="ghost"
                  onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
                >
                  <ArrowBackIcon />
                </IconButton>
                <IconButton aria-label="Save" variant="ghost" type="submit">
                  <CheckIcon />
                </IconButton>
              </Flex>
            </VStack>
          </RouterForm>
        );
      }}
    </Formik>
  );
};

export default StatementEdit;
