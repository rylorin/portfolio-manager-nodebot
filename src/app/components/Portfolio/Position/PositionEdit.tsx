import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import { FunctionComponent, default as React } from "react";
import { Form as RouterForm, useLoaderData, useNavigate, useParams, useSubmit } from "react-router-dom";
import { PositionEntry } from "../../../../routers/";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type PositionEditProps = Record<string, never>;

const PositionEdit: FunctionComponent<PositionEditProps> = ({ ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const thisPosition = useLoaderData() as PositionEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={thisPosition}
      onSubmit={(values, _actions): void => {
        // console.log(values);
        submit(values, { method: "POST" }).catch(() => console.error("Failed to submit data!"));
      }}
    >
      {(formik: FormikProps<PositionEntry>): React.ReactNode => {
        return (
          <RouterForm method="post" onSubmit={formik.handleSubmit}>
            <VStack>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Position Id:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisPosition.id}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Date:
                </Text>
                <Text w="200px" textAlign="right">
                  {new Date(thisPosition.openDate).toLocaleDateString()}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Symbol:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisPosition.contract.symbol}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Quantity:
                </Text>
                <Text w="200px" textAlign="right">
                  <Field name="quantity" type="number" />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Cost:
                </Text>
                <Text w="200px" textAlign="right">
                  <Field name="cost" type="number" />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  PRU:
                </Text>
                <Text w="200px" textAlign="right">
                  {formatNumber(thisPosition.pru, 2)}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Value:
                </Text>
                <Text w="200px" textAlign="right">
                  {formatNumber(thisPosition.value, 2)}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  P/L:
                </Text>
                <Text w="200px" textAlign="right">
                  <Number value={thisPosition.pnl} decimals={2} />
                </Text>
              </Flex>
              {"engaged" in thisPosition && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Engaged:
                  </Text>
                  <Text w="200px" textAlign="right">
                    <Number value={thisPosition.engaged as number} decimals={2} />
                  </Text>
                </Flex>
              )}
              {"risk" in thisPosition && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Risk:
                  </Text>
                  <Text w="200px" textAlign="right">
                    <Number value={thisPosition.risk as number} decimals={2} />
                  </Text>
                </Flex>
              )}
              {"apy" in thisPosition && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    APY:
                  </Text>
                  <Text w="200px" textAlign="right">
                    <Number value={thisPosition.apy as number} decimals={2} isPercent />
                  </Text>
                </Flex>
              )}
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Trade:
                </Text>
                <Text w="200px">
                  <Field name="trade_unit_id" type="number" />
                </Text>
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
            </VStack>
          </RouterForm>
        );
      }}
    </Formik>
  );
};

export default PositionEdit;
