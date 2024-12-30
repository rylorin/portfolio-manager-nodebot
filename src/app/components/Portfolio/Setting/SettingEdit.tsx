import { ArrowBackIcon, CheckIcon } from "@chakra-ui/icons";
import { Flex, IconButton, Select, Text, VStack } from "@chakra-ui/react";
import { Field, Formik, FormikProps } from "formik";
import React, { FunctionComponent } from "react";
import { Form, useLoaderData, useNavigate, useSubmit } from "react-router-dom";
import { SettingEntry } from "../../../../routers/";
import { settingEditLoader } from "./loaders";

type Props = Record<string, never>;

const SettingEdit: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { setting, contracts } = useLoaderData<typeof settingEditLoader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Formik
      initialValues={setting}
      onSubmit={(values, _actions): void => {
        submit(values, { method: "POST" }).catch(() => console.error("Failed to submit data!"));
      }}
    >
      {(formik: FormikProps<SettingEntry>): React.ReactNode => {
        return (
          <Form method="post" onSubmit={formik.handleSubmit}>
            <VStack>
              {setting.id && (
                <Flex justifyContent="center" gap="2">
                  <Text w="90px" as="b" textAlign="right">
                    Setting Id:
                  </Text>
                  <Text w="200px" textAlign="right">
                    {setting.id}
                  </Text>
                </Flex>
              )}
              <Flex justifyContent="center" gap="2">
                <Text w="90px" as="b" textAlign="right">
                  Symbol:
                </Text>
                <Field as={Select} name="stock_id" w="200px" type="number" variant="outline">
                  {setting.underlying && (
                    <option value={setting.underlying.id} key={`k${setting.underlying.id}`}>
                      {setting.underlying.symbol} ({setting.underlying.id})
                    </option>
                  )}
                  <option disabled={true}>-</option>
                  {contracts
                    .filter((item) => item.id != setting.stock_id && item.exchange != "VALUE")
                    .sort((a, b) => a.symbol.localeCompare(b.symbol))
                    .map((item) => (
                      <option value={item.id} key={`k${item.id}`}>
                        {item.symbol} ({item.id})
                      </option>
                    ))}
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
            </VStack>
          </Form>
        );
      }}
    </Formik>
  );
};

export default SettingEdit;