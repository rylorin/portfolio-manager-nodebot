import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { TradeStatus, TradeStrategy } from "../../../../models/trade.types";
import { TradeEntry } from "../../../../routers/trades.types";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";

type Props = Record<string, never>;

const TradeEdit: FunctionComponent<Props> = ({ ..._rest }): JSX.Element => {
  const thisTrade = useLoaderData() as TradeEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={thisTrade}
      onSubmit={(values, _actions): void => {
        // console.log(values);
        submit(values, { method: "post" });
      }}
    >
      {(formik: FormikProps<TradeEntry>): JSX.Element => {
        return (
          <Form method="post" onSubmit={formik.handleSubmit}>
            <VStack>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Trade Id:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisTrade.id}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Open date:
                </Text>
                <Text w="200px" textAlign="right">
                  {new Date(thisTrade.openingDate).toLocaleString()}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Close date:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisTrade.closingDate && new Date(thisTrade.closingDate).toLocaleString()}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Duration:
                </Text>
                <Text w="200px" textAlign="right">
                  {formatNumber(thisTrade.duration)}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Status:
                </Text>
                <Text w="200px" textAlign="right">
                  <Field as="select" name="status" w="200px">
                    {Object.keys(TradeStatus).map((k, v) => (
                      <option value={v} key={`v${v}`}>
                        {k}
                      </option>
                    ))}
                  </Field>
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Strategy:
                </Text>
                <Text w="200px" textAlign="right">
                  <Field as="select" name="strategy" w="200px">
                    {Object.keys(TradeStrategy).map((k, v) => (
                      <option value={v} key={`v${v}`}>
                        {k}
                      </option>
                    ))}
                  </Field>
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Symbol:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisTrade.underlying.symbol}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Currency:
                </Text>
                <Text w="200px" textAlign="right">
                  {thisTrade.currency}
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Risk:
                </Text>
                <Text w="200px">
                  <Field name="risk" type="number" />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  P&L (Base):
                </Text>
                <Text w="200px" textAlign="right">
                  <Number value={thisTrade.pnlInBase} />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  P&L:
                </Text>
                <Text w="200px" textAlign="right">
                  <Number value={thisTrade.pnl} />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  APY:
                </Text>
                <Text w="200px" textAlign="right">
                  <Number value={thisTrade.apy} isPercent />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Notes:
                </Text>
                <Text w="200px">
                  <Field name="comment" type="text" as="textarea" />
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

export default TradeEdit;
