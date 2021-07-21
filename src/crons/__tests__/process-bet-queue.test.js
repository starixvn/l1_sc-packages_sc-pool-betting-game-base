import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { logger } from "sc-common";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { ProcessBetQueue } from "../process-bet-queue";

const gameData = new GameData(10);
gameData.gameConfigs = { odds: { odd: 1, even: 1 } };
const definition = {
    id: 1,
    name: "game name",
    durations: { lockingBet: 5, wholeRound: 30, placingBets: 25 },
    choicesMapper: { odd: 1 },
};
const placeBetPublisher = stub(Core.BaseEventPublishers.PlaceBetPublisher);
/** @type {logger}*/
const logService = stub(logger);
/** @type {mongoose.Model}*/
const betsRepository = { findOne: () => {}, updateOne: () => {} };

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);
betLogsRepository.create = jest.fn();

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);
userInfosRepository.updateOne = jest.fn();
const placeBet = jest.fn();
const validateBalance = jest.fn();

const processBetQueue = new ProcessBetQueue({
    definition,
    gameData,
    placeBetPublisher,
    placeBet,
    logService,
    betsRepository,
    betLogsRepository,
    userInfosRepository,
    validateBalance,
});

describe("ProcessBetQueue test", () => {
    it("_inherit Core.Crons.ProcessBetQueue", () => {
        expect(processBetQueue instanceof Core.Crons.ProcessBetQueue).toBeTruthy();
    });

    describe("_isUUSAccount", () => {
        it("_currency is UUS", () => {
            const player = { session: { currency: "UUS" } };

            expect(processBetQueue.isUUSAccount(player)).toBeTruthy();
        });

        it("_currency is not UUS", () => {
            const player = { session: { currency: "$US" } };

            expect(processBetQueue.isUUSAccount(player)).toBeFalsy();
        });
    });

    describe("adjustTotalBets", () => {
        beforeEach(() => {
            spyOn(Core.Crons.ProcessBetQueue.prototype, "adjustTotalBets");
        });
        it("_isUUSAccount", () => {
            const player = { session: { currency: "UUS" } };
            const bet = { betChoice: "odd", amount: 10 };

            processBetQueue.adjustTotalBets(player, bet);

            expect(Core.Crons.ProcessBetQueue.prototype.adjustTotalBets).not.toHaveBeenCalled();
        });

        it("_isNotUUSAccount", () => {
            const player = { session: { currency: "$US" } };
            const bet = { betChoice: "odd", amount: 10 };

            processBetQueue.adjustTotalBets(player, bet);

            expect(Core.Crons.ProcessBetQueue.prototype.adjustTotalBets).toHaveBeenCalled();
        });
    });

    describe("upsertBet", () => {
        it("_existingBet_save bet", () => {
            const player = { session: { currency: "UUS" } };
            const bet = { betChoice: "odd", amount: 10 };
            const existingBet = { uid: 1, amount: 200, choice: "even", save: jest.fn() };
            spyOn(existingBet, "save");
            spyOn(betsRepository, "findOne").and.callFake(() => {
                return {
                    exec: () => {
                        return existingBet;
                    },
                };
            });

            processBetQueue.upsertBet(player, 1, bet);

            expect(betsRepository.findOne).toHaveBeenCalled();
        });

        it("_newBet", () => {
            const player = { UID: 1, profile: { name: "AAA" }, session: { memberId: 1234, currency: "$US" } };
            const bet = { betChoice: "odd", amount: 10 };

            spyOn(betsRepository, "findOne").and.callFake(() => {
                return {
                    exec: () => {
                        return null;
                    },
                };
            });

            spyOn(betsRepository, "updateOne");

            processBetQueue.upsertBet(player, 1, bet);

            expect(betsRepository.findOne).toHaveBeenCalled();
        });
    });
});
