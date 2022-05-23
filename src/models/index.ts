import { Sequelize } from "sequelize-typescript";
export { Contract } from "./contract.model";
export { Stock } from "./stock.model";
export { Option } from "./option.model";
export { OpenOrder } from "./openorder.model";
export { Portfolio } from "./portfolio.model";
export { Position } from "./position.model";
export { Cash } from "./cash.model";
export { Parameter } from "./parameter.model";
export { Currency } from "./currency.model";
export { Balance } from "./balance.model";

export const sequelize = new Sequelize(
    {
        dialect: "sqlite",
        storage: __dirname + "/../../../db/var/db/data.db",
        models: [__dirname + "/*.model.js"], // or [Player, Team],
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
