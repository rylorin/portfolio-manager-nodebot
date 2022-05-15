import { Sequelize } from "sequelize-typescript";
import { Contract } from "./contract.model";
import { Stock } from "./stock.model";
import { Option } from "./option.model";
import { OpenOrder } from "./openorder.model";
import { Portfolio } from "./portfolio.model";
import { Position } from "./position.model";
import { Cash } from "./cash.model";
import { Parameter } from "./parameter.model";
import { Currency } from "./currency.model";

// require("dotenv").config();

const sequelize = new Sequelize(
    {
        dialect: "sqlite",
        storage: __dirname + "/../../../db/var/db/data.db",
        models: [ __dirname + "/*.model.js" ], // or [Player, Team],
        modelMatch: (filename, member) => {
            return filename.substring(0, filename.indexOf(".model")) === member.toLowerCase();
        },
        logging: false, 
    }
);

export const initDB = async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
};

export { sequelize, Contract, Stock, Option, OpenOrder, Portfolio, Position, Cash, Parameter, Currency };