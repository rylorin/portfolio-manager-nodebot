import { Flex, IconButton, Select, Text } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { FaArrowLeft as ArrowBackIcon, FaCheck as CheckIcon } from "react-icons/fa6";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { CashStrategy } from "../../../../models/types";
import { ContractEntry, PortfolioEntry } from "../../../../routers";
import { obfuscate } from "../../../utils";
import { portfolioEditLoader } from "./loaders";

type PortfolioShowProps = Record<string, never>;

const PortfolioEdit: FunctionComponent<PortfolioShowProps> = ({ ..._rest }): React.ReactNode => {
  const { portfolio, contracts }: { portfolio: PortfolioEntry; contracts: ContractEntry[] } =
    useLoaderData<typeof portfolioEditLoader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={portfolio}
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
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Id:
              </Text>
              <Text textAlign="left" w="120px">
                {portfolio.id}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Name:
              </Text>
              <Text w="120px" textAlign="left">
                {portfolio.name}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Account:
              </Text>
              <Text w="120px" textAlign="left">
                {obfuscate(portfolio.account)}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Currency:
              </Text>
              <Text w="120px" textAlign="left">
                {portfolio.baseCurrency}
              </Text>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Cash contract:
              </Text>
              <Field as={Select} name="benchmark_id" w="200px" type="number" variant="outline">
                <option value={portfolio.benchmark_id} key={`k${portfolio.benchmark_id}`}>
                  {portfolio.benchmark.symbol} ({portfolio.benchmark_id})
                </option>
                <option disabled={true}>-</option>
                {contracts
                  .filter((item) => item.id != portfolio.benchmark_id && item.exchange != "VALUE")
                  .sort((a, b) => a.symbol.localeCompare(b.symbol))
                  .map((item) => (
                    <option value={item.id} key={`k${item.id}`}>
                      {item.symbol} ({item.id})
                    </option>
                  ))}
              </Field>
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Status:
              </Text>
              {/* <Select w="200px" name="status" variant="outline" value={formik.values.status}> */}
              <Field as={Select} name="cashStrategy" w="200px" type="number" variant="outline">
                {Object.entries(CashStrategy).map((v, k) => (
                  <option value={v[1]} key={`k${k}`}>
                    {v[0]} ({v[1]})
                  </option>
                ))}
              </Field>
              {/* </Select> */}
            </Flex>
            <Flex justifyContent="center" gap="2">
              <Text w="150px" as="b" textAlign="right">
                Min buy units:
              </Text>
              <Text w="200px">
                <Field name="minBenchmarkUnits" type="number" />
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
          </Form>
        );
      }}
    </Formik>
  );
};

export default PortfolioEdit;
