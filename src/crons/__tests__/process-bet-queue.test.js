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

const testAccount = { session: { isTestCurrency: true, currencyName: "UUS" } };
const realAccount = { session: { isTestCurrency: false, currencyName: "$US" }, profile: { name: "account name" } };
const bet = { betChoice: "odd", amount: 10 };
const rate = 1;

describe("ProcessBetQueue", () => {
    it("should inherit Core.Crons.ProcessBetQueue", () => {
        expect(processBetQueue instanceof Core.Crons.ProcessBetQueue).toBeTruthy();
    });

    describe("isTestAccount", () => {
        describe("when player's currency is test", () => {
            it("should return true", () => {
                // Act
                const actualResult = processBetQueue.isTestAccount(testAccount);

                // Assert
                expect(actualResult).toBeTruthy();
            });
        });

        describe("when player's currency is real", () => {
            it("should return false", () => {
                // Act
                const actualResult = processBetQueue.isTestAccount(realAccount);

                // Assert
                expect(actualResult).toBeFalsy();
            });
        });
    });

    describe("isCountOnTotalBets", () => {
        it("should return true", () => {
            // Act & Assert
            expect(processBetQueue.isCountOnTotalBets({})).toBeTruthy();
        });
    });

    describe("adjustTotalBets", () => {
        beforeAll(() => {
            // Arrange
            spyOn(Core.Crons.ProcessBetQueue.prototype, "adjustTotalBets");
        });

        describe("when account is test", () => {
            it("should NOT call super.adjustTotalBets", () => {
                // Act
                processBetQueue.adjustTotalBets(testAccount, bet);

                // Assert
                expect(Core.Crons.ProcessBetQueue.prototype.adjustTotalBets).not.toHaveBeenCalled();
            });
        });

        describe("when account is real", () => {
            it("should call super.adjustTotalBets", () => {
                // Act
                processBetQueue.adjustTotalBets(realAccount, bet);

                // Assert
                expect(Core.Crons.ProcessBetQueue.prototype.adjustTotalBets).toHaveBeenCalled();
            });
        });
    });

    describe("upsertBet", () => {
        describe("when existing bet", () => {
            // Arrange
            const existingBet = { uid: 1, amount: 200, choice: "even", save: jest.fn() };
            beforeAll(() => {
                spyOn(existingBet, "save");
                spyOn(betsRepository, "findOne").and.callFake(() => {
                    return {
                        exec: () => {
                            return existingBet;
                        },
                    };
                });
                spyOn(processBetQueue, "updateBet");
            });

            it("should call updateBet", async () => {
                // Act
                await processBetQueue.upsertBet(realAccount, 1, bet, rate);

                // Assert
                expect(processBetQueue.updateBet).toHaveBeenCalled();
            });
        });

        describe("when NOT found existing bet", () => {
            beforeAll(() => {
                spyOn(betsRepository, "findOne").and.callFake(() => {
                    return {
                        exec: () => {
                            return null;
                        },
                    };
                });
                spyOn(processBetQueue, "insertBet");
            });

            it("should call insertBet", async () => {
                // Act
                await processBetQueue.upsertBet(realAccount, 1, bet, rate);

                // Assert
                expect(processBetQueue.insertBet).toHaveBeenCalled();
            });
        });
    });

    describe("insertBetLog", () => {
        beforeAll(async () => {
            spyOn(betLogsRepository, "create");
            await processBetQueue.insertBetLog(realAccount, 1, bet, rate);
        });

        it("should call betLogsRepository.create", () => {
            expect(betLogsRepository.create).toHaveBeenCalled();
        });
    });

    describe("updateBet", () => {
        // Arrange
        const existingBet = {
            amount: 10,
            totalAmount: 10,
            baseAmount: 10,
            save: jest.fn(),
        };

        beforeAll(async () => {
            // Act
            await processBetQueue.updateBet(existingBet, bet, rate);
        });

        it("should call save existingBet", () => {
            // Assert
            expect(existingBet.save).toHaveBeenCalled();
        });
    });

    describe("insertBet", () => {
        beforeAll(async () => {
            spyOn(betsRepository, "updateOne");
            await processBetQueue.insertBet(realAccount, bet, 1, gameData.gameConfigs, rate);
        });

        it("should call betsRepository.updateOne", () => {
            expect(betsRepository.updateOne).toHaveBeenCalled();
        });
    });
});
