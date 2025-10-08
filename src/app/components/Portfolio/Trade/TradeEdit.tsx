import { createListCollection, Flex, IconButton, Text, Textarea, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { LuArrowLeft as ArrowBackIcon, LuCheck as CheckIcon } from "react-icons/lu";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { TradeStatus, TradeStrategy } from "../../../../models/trade.types";
import { TradeEntry } from "../../../../routers/";
import { formatNumber } from "../../../utils";
import Number from "../../Number/Number";
import { SelectContent, SelectRoot, SelectTrigger, toArray } from "../../ui/select";
import { tradeStatus2String, tradeStrategy2String } from "./utils";

type Props = Record<string, never>;
type ItemType = { label: string; value: string }; // eslint-disable-line @typescript-eslint/consistent-type-definitions

const TradeEdit: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const thisTrade = useLoaderData() as TradeEntry;
  const navigate = useNavigate();
  const submit = useSubmit();

  const tradeStatus = createListCollection<ItemType>({
    items: toArray<ItemType>(TradeStatus),
    itemToString: (item: ItemType): string => item.label,
    itemToValue: (item: ItemType): string => item.value,
  });

  const tradeStrategy = createListCollection<ItemType>({
    items: toArray(TradeStrategy),
  });

  return (
    <Formik
      initialValues={thisTrade}
      onSubmit={(values, _actions): void => {
        console.log("submit values", values);
        submit(
          values,
          // {
          //   ...values,
          //   // Select values are returned as string, therefore we have to convert them to numbers, if needed
          //   status: parseInt(values.status as unknown as string),
          //   strategy: parseInt(values.strategy as unknown as string),
          // },
          { method: "POST" },
        ).catch(() => console.error("Failed to submit data!"));
      }}
    >
      {(formik: FormikProps<TradeEntry>): React.ReactNode => {
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
                <Field as="span" name="status" w="200px" type="number" variant="outline">
                  <SelectRoot
                    collection={tradeStatus}
                    w="200px"
                    onValueChange={(details) => {
                      console.log("Status changed to", details);
                      void formik.setFieldValue("status", details.value[0] as unknown as TradeStatus);
                      // formik.setFieldTouched("status", true, false);
                    }}
                  >
                    <SelectTrigger placeholder={tradeStatus2String(formik.values.status)} />
                    <SelectContent collection={tradeStatus} />
                  </SelectRoot>
                </Field>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Strategy:
                </Text>
                <Field as="span" name="strategy" w="200px" type="number" variant="outline">
                  <SelectRoot
                    collection={tradeStrategy}
                    w="200px"
                    onValueChange={(details) => {
                      console.log("Strategy changed to", details);
                      void formik.setFieldValue("strategy", details.value[0] as unknown as TradeStrategy);
                      // formik.setFieldTouched("strategy", true, false);
                    }}
                  >
                    <SelectTrigger placeholder={tradeStrategy2String(formik.values.strategy)} />
                    <SelectContent collection={tradeStrategy} />
                  </SelectRoot>
                </Field>
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
                <Text w="200px" textAlign="right">
                  <Number value={thisTrade.risk} />
                </Text>
              </Flex>
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  P&L:
                </Text>
                <Text w="200px" textAlign="right">
                  <Number value={thisTrade.PnL} />
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
                  APR:
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
                  <Field name="comment" type="text" as={Textarea} variant="outline" />
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

export default TradeEdit;
