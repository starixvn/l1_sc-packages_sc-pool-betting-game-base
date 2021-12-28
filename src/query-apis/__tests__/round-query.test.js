import { stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { RoundQuery } from "../round-query";

/** @type {mongoose.Model}*/
const roundsRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const currencyRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const exchangeRatesRepository = stubMongooseModelStupidly(mongoose.Model);

const roundQuery = new RoundQuery(roundsRepository, betLogsRepository, currencyRepository, exchangeRatesRepository);

describe("RoundQuery test", () => {
    beforeEach(() => {});

    it("_inherit Core.QueryApis.RoundQuery", () => {
        expect(roundQuery instanceof Core.QueryApis.RoundQuery).toBeTruthy();
    });

    describe("_getRound", () => {
        it("_always_calls getOne", () => {
            const round = {
                exchangeRateId: 1,
            };
            spyOn(Core.QueryApis.RoundQuery.prototype, "getOne").and.returnValue(round);

            const betLogs = [
                { uid: 1, choice: "odd", amount: 10 },
                { uid: 3, choice: "odd", amount: 20 },
            ];
            betLogsRepository.find().lean().exec.mockReturnValue(betLogs);

            roundQuery.getRound(1);

            expect(Core.QueryApis.RoundQuery.prototype.getOne).toHaveBeenCalled();
        });

        it("should return round info & empty object total when user has no exchange rate and round has exchangeId", async () => {
            const round = { exchangeRateId: 1 };
            spyOn(Core.QueryApis.RoundQuery.prototype, "getOne").and.returnValue(round);
            exchangeRatesRepository.findOne().lean().exec.mockReturnValue({ code: {} });
            const actualResult = await roundQuery.getRound(1, {});

            expect(actualResult).toEqual({ ...round, total: {} });
        });
    });
});
