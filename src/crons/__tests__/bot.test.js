import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { Bot } from "../bot";

const definition = { id: 1, name: "game name", durations: { lockingBet: 5 }, choices: ["odd", "even"] };
const gameData = new GameData(30);
gameData.totalBets = { odd: 200, even: 50 };

const publisher = stub(Core.BaseEventPublishers.BaseEventPublisher);

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betsRepository = stubMongooseModelStupidly(mongoose.Model);
betsRepository.updateOne = jest.fn();

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);

const bot = new Bot(definition, gameData, publisher, userInfosRepository, betsRepository, betLogsRepository);

describe("bot", () => {
    it("should inherit Core.Crons.BaseBot", () => {
        expect(bot instanceof Core.Crons.BaseBot).toBeTruthy();
    });

    describe("run", () => {
        beforeAll(() => {
            // Arrange
            spyOn(bot, "getBotsAndPlaceBet");
        });

        describe("when bot NOT existing ", () => {
            beforeAll(async () => {
                // Arrange
                bot.botList = [];

                // Act
                await bot.run();
            });

            it("should NOT call getBotsAndPlaceBet", () => {
                // Assert
                expect(bot.getBotsAndPlaceBet).not.toHaveBeenCalled();
            });
        });

        describe("when bot existing ", () => {
            beforeAll(async () => {
                // Arrange
                bot.botList = [{ id: 1 }];

                // Act
                await bot.run();
            });

            it("should NOT call getBotsAndPlaceBet", () => {
                // Assert
                expect(bot.getBotsAndPlaceBet).toHaveBeenCalled();
            });
        });
    });

    describe("resetAllBotData", () => {
        // Arrange
        bot.totalBotTickets = 10;
        bot.totalUnroundTickets = 20;
        bot.totalBotTickets = 30;

        beforeAll(() => {
            // Act
            bot.resetAllBotData();
        });

        it("should reset totalBotTickets", () => {
            // Assert
            expect(bot.totalBotTickets).toEqual(0);
        });

        it("should reset totalUnroundTickets", () => {
            // Assert
            expect(bot.totalUnroundTickets).toEqual(0);
        });
    });

    describe("placeBet", () => {
        const user = { id: 1, name: "bot" };

        beforeAll(async () => {
            // Arrange
            spyOn(betsRepository, "updateOne");

            // Act
            await bot.placeBet(user, "odd");
        });

        it("should call create bet log", () => {
            // Assert
            expect(betLogsRepository.create).toHaveBeenCalled();
        });
    });

    describe("reset", () => {
        describe("when bot was disabled", () => {
            beforeAll(async () => {
                // Arrange
                gameData.gameConfigs = { botenabled: false };

                // Act
                await bot.reset();
            });

            it("should reset botList", () => {
                // Assert
                expect(bot.botList).toEqual([]);
            });
        });

        describe("when bot was enabled", () => {
            beforeAll(async () => {
                // Arrange
                gameData.gameConfigs = { botenabled: true };
                userInfosRepository.find().lean().exec.mockReturnValue([]);

                // Act
                await bot.reset();
            });

            it("should call find user info", () => {
                // Assert
                expect(userInfosRepository.find().lean().exec).toHaveBeenCalled();
            });
        });
    });

    describe("getMaxTicketsToBet", () => {
        describe("when remainingTime < durations.balancingBetTime", () => {
            it("should return floor of  (this.botList.length - (this.botList.length * this.botBufferRatio) / 100) / remainingTime", () => {
                // Arrange
                const remainingTime = 20;
                const durations = { balancingBetTime: 30 };
                const expectedValue = 0;
                bot.botList = [{ id: 1 }];

                // Act
                const actualValue = bot.getMaxTicketsToBet(remainingTime, durations);

                // Assert
                expect(actualValue).toStrictEqual(expectedValue);
            });
        });

        describe("when remainingTime >= durations.balancingBetTime", () => {
            it("should return random between { min: (maxBotRandom * 2) / 3, max: maxBotRandom }", () => {
                // Arrange
                const remainingTime = 40;
                const durations = { balancingBetTime: 30, lockingBet: 35 };
                const expectedValue = 0;
                bot.botList = [];

                // Act
                const actualValue = bot.getMaxTicketsToBet(remainingTime, durations);

                // Assert
                expect(actualValue).toStrictEqual(expectedValue);
            });
        });
    });

    describe("getBotsAndPlaceBet", () => {
        describe("when has bot", () => {
            it("should call placeBet", async () => {
                // Arrange
                const maxTickets = 3;
                bot.botList = [{ id: 1 }];
                const choices = null;
                spyOn(bot, "getBetChoice").and.returnValue(10);
                spyOn(bot, "placeBet");

                // Act
                await bot.getBotsAndPlaceBet(maxTickets, choices);

                // Assert
                expect(bot.placeBet).toHaveBeenCalledWith({ id: 1 }, 10);
            });
        });

        describe("when not has bot", () => {
            it("should not call placeBet", async () => {
                // Arrange
                const maxTickets = 3;
                bot.botList = [];
                const choices = null;
                spyOn(bot, "getBetChoice").and.returnValue(10);
                spyOn(bot, "placeBet");

                // Act
                await bot.getBotsAndPlaceBet(maxTickets, choices);

                // Assert
                expect(bot.placeBet).not.toHaveBeenCalled();
            });
        });
    });
});
