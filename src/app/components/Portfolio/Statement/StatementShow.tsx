import { ArrowBackIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { Flex, IconButton, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/statement.types";
import { StatementEntry } from "../../../../routers/statements.types";
import BaseStatement from "./BaseStatement";
import BondStatementProps from "./BondStatementProps";
import CorpoStatementProps from "./CorpoStatementProps";
import DividendStatementProps from "./DividendStatementProps";
import InterestStatementProps from "./InterestStatementProps";

type Props = Record<string, never>;

/**
 * Statements item display component
 * @param param Component properties
 * @returns
 */
const StatementShow: FunctionComponent<Props> = ({ ..._rest }): React.ReactNode => {
  const { portfolioId } = useParams();
  const theStatement = useLoaderData() as StatementEntry;
  const navigate = useNavigate();

  return (
    <>
      <VStack>
        <BaseStatement portfolioId={parseInt(portfolioId)} statement={theStatement} />
        {theStatement.statementType == StatementTypes.InterestStatement && (
          <InterestStatementProps portfolioId={parseInt(portfolioId)} statement={theStatement} />
        )}
        {theStatement.statementType == StatementTypes.DividendStatement && (
          <DividendStatementProps portfolioId={parseInt(portfolioId)} statement={theStatement} />
        )}
        {theStatement.statementType == StatementTypes.BondStatement && (
          <BondStatementProps portfolioId={parseInt(portfolioId)} statement={theStatement} />
        )}
        {theStatement.statementType == StatementTypes.CorporateStatement && (
          <CorpoStatementProps portfolioId={parseInt(portfolioId)} statement={theStatement} />
        )}
        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton aria-label="Back" icon={<ArrowBackIcon />} variant="ghost" onClick={(): void => navigate(-1)} />
          <IconButton aria-label="Edit" icon={<EditIcon />} variant="ghost" as={RouterLink} to="edit" />
          <Form method="post" action="delete" className="inline">
            <IconButton aria-label="Delete" icon={<DeleteIcon />} variant="ghost" type="submit" />
          </Form>
        </Flex>
      </VStack>
    </>
  );
};

export default StatementShow;
