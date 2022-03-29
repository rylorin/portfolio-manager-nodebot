import { Sequelize } from "sequelize-typescript";
import { Contract } from './contract.model';
import { Stock } from './stock.model';
import { Option } from './option.model';
import { OpenOrder } from './openorder.model';

require('dotenv').config();

const sequelize = new Sequelize(
    {
        dialect: "sqlite",
        storage: __dirname + '/../../../db/var/db/data.db',
        models: [ __dirname + '/*.model.js' ], // or [Player, Team],
        modelMatch: (filename, member) => {
            return filename.substring(0, filename.indexOf('.model')) === member.toLowerCase();
        },
        logging: false, 
    }
);

export const initDB = async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
};

export { Sequelize, sequelize, Contract, Stock, Option, OpenOrder };