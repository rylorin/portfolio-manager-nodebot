import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { FaArrowLeft as ArrowBackIcon, FaCheck as CheckIcon } from "react-icons/fa6";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { BalanceEntry } from "../../../../routers/";

type Props = Record<string, never>;

const BalanceEdit: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
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
          { method: "POST" },
        ).catch(() => console.error("Failed to submit data!"));
      }}
    >
      {(formik: FormikProps<BalanceEntry>): React.ReactNode => {
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
          </Form>
        );
      }}
    </Formik>
  );
};

export default BalanceEdit;
