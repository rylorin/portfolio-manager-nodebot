import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/balances.types";

type Props = Record<string, never>;

const BalanceEdit: FunctionComponent<Props> = ({ ..._rest }): React.JSX.Element => {
  const thisBalance = useLoaderData() as BalanceEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={thisBalance}
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
      {(formik: FormikProps<BalanceEntry>): React.JSX.Element => {
        return (
          <Form method="post" onSubmit={formik.handleSubmit}>
            <VStack>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Balance Id:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisBalance.id}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Amount:
                </Text>
                <Text w="200px">
                  <Field name="quantity" type="number" />
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
          </Form>
        );
      }}
    </Formik>
  );
};

export default BalanceEdit;
