import { Flex, IconButton, VStack } from "@chakra-ui/react";
import { FunctionComponent, default as React } from "react";
import { LuArrowLeft as ArrowBackIcon, LuTrash2 as DeleteIcon, LuPencil as EditIcon } from "react-icons/lu";
import { Form, Link as RouterLink, useLoaderData, useNavigate, useParams } from "react-router-dom";
import { StatementTypes } from "../../../../models/statement.types";
import { StatementEntry } from "../../../../routers/statements.types";
import BaseStatement from "./BaseStatement";
import BondStatementProps from "./BondStatementProps";
import CorpoStatementProps from "./CorpoStatementProps";
import DividendStatementProps from "./DividendStatementProps";
import InterestStatementProps from "./InterestStatementProps";
import OptionStatementProps from "./OptionStatementProps";

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
        {theStatement.statementType == StatementTypes.OptionStatement && (
          <OptionStatementProps portfolioId={parseInt(portfolioId)} statement={theStatement} />
        )}

        <Flex justifyContent="center" gap="2" mt="1">
          <IconButton
            aria-label="Back"
            variant="ghost"
            onClick={async () => navigate(-1)} // eslint-disable-line @typescript-eslint/no-misused-promises
          >
            <ArrowBackIcon />
          </IconButton>
          <IconButton aria-label="Edit" variant="ghost" asChild>
            <RouterLink to="edit">
              <EditIcon />
            </RouterLink>
          </IconButton>
          <Form method="post" action="delete" className="inline">
            <IconButton aria-label="Delete" variant="ghost" type="submit">
              <DeleteIcon />
            </IconButton>
          </Form>
        </Flex>
      </VStack>
    </>
  );
};

export default StatementShow;
