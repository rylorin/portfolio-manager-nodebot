import { FunctionComponent, default as React } from "react";
import { useLoaderData, useParams } from "react-router-dom";
import { StatementEntry } from "../../../../routers/statements.types";

interface Props {
  content?: StatementEntry[];
}

const formatDate = (d: number): string => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11, so we add 1 to get 1-12
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  // Format the date as YYYY-MM-DD
  return date.toISOString();
  return `${year}${month < 10 ? "0" : ""}${month}${day < 10 ? "0" : ""}${day} ${hours < 10 ? "0" : ""}${hours}${minutes < 10 ? "0" : ""}${minutes}${seconds < 10 ? "0" : ""}${seconds}`;
};

const statementType = (item: StatementEntry): string => {
  switch (item.statementType) {
    case "Trade":
    case "TradeOption":
      return item.quantity > 0 ? "Achat" : "Vente";
    case "OtherFee":
      return item.amount > 0 ? "Remboursement de Frais" : "Frais";
    case "Dividend":
      return "Dividendes";
    case "SalesTax":
    case "Tax":
    case "WithHolding":
      return item.amount > 0 ? "Remboursement Impôts / Taxes" : "Impôts / Taxes";
    case "Interest":
      return item.amount > 0 ? "Intérêts" : "Frais d'Intérêts";
    case "CorporateStatement":
      return "Corporate Action";
    case "Bond":
      return "Obligation";
    default:
      return item.statementType || "N/A";
  }
};

const statementSymbol = (item: StatementEntry): string => {
  switch (item.statementType) {
    case "Trade":
    case "Dividend":
      return item.underlying?.symbol || "N/A";
    case "TradeOption":
      return item.option?.symbol || "N/A";
    default:
      return "";
  }
};

const statementIsin = (item: StatementEntry): string => {
  switch (item.statementType) {
    case "Trade":
    case "Dividend":
      return item.underlying?.isin;
    default:
      return "";
  }
};

const statementSymbolName = (item: StatementEntry): string => {
  switch (item.statementType) {
    case "Trade":
    case "Dividend":
      return item.underlying?.name || "N/A";
    case "TradeOption":
      return item.option?.name || "N/A";
    default:
      return "";
  }
};

const statementPrice = (item: StatementEntry): string => {
  let price = "";
  switch (item.statementType) {
    case "Trade":
    case "TradeOption":
      price = `${item.price}`;
      break;
  }
  return price.replace(".", ",");
};

const statementAmount = (item: StatementEntry): string => {
  const amount = `${item.amount}`;
  return amount.replace(".", ",");
};

const statementFees = (item: StatementEntry): string => {
  const amount = `${"fees" in item ? item.fees : 0}`;
  return amount.replace(".", ",");
};

const statementUnits = (item: StatementEntry): string => {
  const amount = `${"quantity" in item ? item.quantity : 0}`;
  return amount.replace(".", ",");
};

/**
 * Statements list component
 * @param param
 * @returns
 */
const StatementsExport: FunctionComponent<Props> = ({ content, ..._rest }): React.ReactNode => {
  const { _portfolioId } = useParams();
  const theStatements = content || (useLoaderData() as StatementEntry[]);

  return (
    <>
      <p>
        Date;Type;Note;Symbole boursier;ISIN;Nom du titre;Parts;Montant brut;Frais;Impôts / Taxes;Valeur;Devise de
        l'opération
      </p>
      {theStatements
        .sort((a: StatementEntry, b: StatementEntry) => a.date - b.date)
        .map((item) => (
          <p key={item.id}>
            {formatDate(item.date)};{statementType(item)};{item.description};{statementSymbol(item)};
            {statementIsin(item)};{statementSymbolName(item)};{statementUnits(item)};{statementPrice(item)};
            {statementFees(item)};0;
            {statementAmount(item)};{item.currency}
          </p>
        ))}
    </>
  );
};

export default StatementsExport;
