import { stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { RoundQuery } from "../round-query";

/** @type {mongoose.Model}*/
const roundsRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);

const roundQuery = new RoundQuery(roundsRepository, userInfosRepository, betLogsRepository);

describe("RoundQuery test", () => {
    beforeEach(() => {
        spyOn(Core.QueryApis.RoundQuery.prototype, "getOne");
    });

    it("_inherit Core.QueryApis.RoundQuery", () => {
        expect(roundQuery instanceof Core.QueryApis.RoundQuery).toBeTruthy();
    });

    describe("_getOne", () => {
        it("_always_calls super", () => {
            const users = [
                { id: 1, name: "user1", currency: "UUS" },
                { id: 2, name: "user2", currency: "UUS" },
            ];
            userInfosRepository.find().lean().exec.mockReturnValue(users);
            const betLogs = [
                { uid: 1, choice: "odd", amount: 10 },
                { uid: 3, choice: "odd", amount: 20 },
            ];
            betLogsRepository.find().lean().exec.mockReturnValue(betLogs);

            roundQuery.getOne(1);

            expect(Core.QueryApis.RoundQuery.prototype.getOne).toHaveBeenCalled();
        });
    });
});
