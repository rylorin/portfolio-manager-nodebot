import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Select, Text } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { PortfolioEntry } from "../../../../routers";
import { obfuscate } from "../../../utils";

type PortfolioShowProps = Record<string, never>;

const PortfolioEdit: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): React.ReactNode => {
  const thisPortfolio = useLoaderData() as PortfolioEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={thisPortfolio}
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
      {(formik: FormikProps<PortfolioEntry>): React.ReactNode => {
        return (
          <Form method="post" onSubmit={formik.handleSubmit}>
            {" "}
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Id:
              </Text>
              <Text textAlign="left" w="120px">
                {thisPortfolio.id}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Name:
              </Text>
              <Text w="120px" textAlign="left">
                {thisPortfolio.name}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Account:
              </Text>
              <Text w="120px" textAlign="left">
                {obfuscate(thisPortfolio.account)}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Currency:
              </Text>
              <Text w="120px" textAlign="left">
                {thisPortfolio.baseCurrency}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="90px" as="b" textAlign="right">
                Cash:
              </Text>
              <Field as={Select} name="benchmark_id" w="200px" type="number" variant="outline">
                <option value={thisPortfolio.benchmark_id} key={`k${thisPortfolio.benchmark_id}`}>
                  {thisPortfolio.benchmark.symbol} ({thisPortfolio.benchmark_id})
                </option>
                <option disabled={true}>-</option>
                {/* {Object.entries(TradeStrategy).map((v, k) => (
                    <option value={v[1]} key={`k${k}`}>
                      {v[0]} ({v[1]})
                    </option>
                  ))} */}
              </Field>
            </Flex>
            <Flex justifyContent="center" gap="2" mt="1">
              <IconButton
                aria-label="Back"
                icon={<ArrowBackIcon />}
                variant="ghost"
                onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
              />
              <IconButton aria-label="Save" icon={<CheckIcon />} variant="ghost" type="submit" />
            </Flex>
          </Form>
        );
      }}
    </Formik>
  );
};

export default PortfolioEdit;
