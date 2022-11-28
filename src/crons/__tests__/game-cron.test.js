import { stub } from "jest-micro-auto-stub";
import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../../event-consumers";
import { RunningRoundInfoPublisher } from "../../event-publishers";
import { GameData } from "../../game-data";
import { Bot } from "../bot";
import { GameCron } from "../game-cron";

describe("game cron", () => {
    // Arrange
    const definition = new Core.GameDefinition({ id: 1, name: "game-name" });
    const gameData = new GameData(0);
    const bot = stub(Bot);
    const settleGameRoundConsumer = stub(SettleGameRoundConsumer);
    const gameStatusPublisher = stub(Core.BaseEventPublishers.GameStatusPublisher);
    const runningRoundInfoPublisher = stub(RunningRoundInfoPublisher);
    const cron = new GameCron({
        definition: definition,
        gameData: gameData,
        bot: bot,
        settleGameRoundConsumer: settleGameRoundConsumer,
        gameStatusPublisher: gameStatusPublisher,
        runningRoundInfoPublisher: runningRoundInfoPublisher,
    });

    it("should inherit BaseGameCron", () => {
        // Assert
        expect(cron instanceof Core.Crons.BaseGameCron);
    });

    describe("resetForNewRound", () => {
        beforeAll(() => {
            // Arrange
            spyOn(Core.Crons.BaseGameCron.prototype, "resetForNewRound");

            // Act
            cron.resetForNewRound();
        });

        it("should call super.resetForNewRound", () => {
            // assert
            expect(Core.Crons.BaseGameCron.prototype.resetForNewRound).toHaveBeenCalled();
        });

        it("should reset bet count data", () => {
            expect(gameData.betCount).toEqual({});
        });

        it("should reset bet count data", () => {
            expect(gameData.totalTestBets).toEqual({});
        });
    });

    describe("proceed", () => {
        describe("when wholeRound", () => {
            it("should checkGameStatus", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 20,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => false);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.checkGameStatus).toHaveBeenCalled();
            });
        });

        describe("when isStartingTime", () => {
            it("should resetForNewRound", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 20,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();
                cron.appConfigs = {
                    enabledBoostedOdds: false,
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.resetForNewRound).toHaveBeenCalled();
            });

            it("should reset bot", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 20,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();
                cron.bot = {
                    reset: jest.fn(),
                };
                cron.appConfigs = {
                    enabledBoostedOdds: false,
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.bot.reset).toHaveBeenCalled();
            });

            it("should reset balanced bot", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 20,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();
                cron.balancedBot = {
                    reset: jest.fn(),
                };
                cron.appConfigs = {
                    enabledBoostedOdds: false,
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.balancedBot.reset).toHaveBeenCalled();
            });

            it("should updatePromotionOddsAndNotify", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 20,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();

                // Act
                await cron.proceed();

                // Assert
                expect(cron.updatePromotionOddsAndNotify).toHaveBeenCalled();
            });
        });

        describe("when placingBets", () => {
            it("should generateResultAndPublishHash", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 11,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishStartPlacingBetStatus: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.roundResultConsumer.generateResultAndPublishHash).toHaveBeenCalled();
            });

            it("should reset settlementResultFromAdmin", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 11,
                    settlementResultFromAdmin: { x: 1 },
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishStartPlacingBetStatus: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.gameData.settlementResultFromAdmin).toEqual({});
            });

            it("should call publishStartPlacingBetStatus", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 11,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishStartPlacingBetStatus: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.gameStatusPublisher.publishStartPlacingBetStatus).toHaveBeenCalled();
            });
        });

        describe("when remainingTime === durations.lockingBet", () => {
            it("should should publishEndPlacingBetStatus", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 5,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => true);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishEndPlacingBetStatus: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.gameStatusPublisher.publishEndPlacingBetStatus).toHaveBeenCalled();
            });
        });

        describe("when remainingTime < 0", () => {
            it("should update remainingTime = wholeRound", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 0,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => false);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishEndPlacingBetStatus: jest.fn(),
                };
                cron.settleGameRoundConsumer = {
                    settleRound: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.gameData.remainingTime).toEqual(20);
            });

            it("should call settleRound", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 0,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => false);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishEndPlacingBetStatus: jest.fn(),
                };
                cron.settleGameRoundConsumer = {
                    settleRound: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.settleGameRoundConsumer.settleRound).toHaveBeenCalled();
            });
        });

        describe("when remainingTime < placingBets", () => {
            it("should call bot.run", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 8,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => false);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishEndPlacingBetStatus: jest.fn(),
                };
                cron.settleGameRoundConsumer = {
                    settleRound: jest.fn(),
                };
                cron.bot = {
                    run: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.bot.run).toHaveBeenCalled();
            });

            it("should call runningRoundInfoPublisher publish", async () => {
                // Arrange
                var cron = new GameCron({});
                cron.gameData = {
                    remainingTime: 8,
                };
                cron.definition = {
                    durations: {
                        wholeRound: 20,
                        placingBets: 10,
                        lockingBet: 5,
                    },
                };
                cron.checkGameStatus = jest.fn();
                cron.isStartingTime = jest.fn(() => false);
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn,
                };
                cron.resetForNewRound = jest.fn();

                cron.appConfigs = {
                    enabledBoostedOdds: true,
                };
                cron.updatePromotionOddsAndNotify = jest.fn();
                cron.resultsRepository = {};
                cron.roundResultConsumer = {
                    generateResultAndPublishHash: jest.fn(),
                };
                cron.gameStatusPublisher = {
                    publishEndPlacingBetStatus: jest.fn(),
                };
                cron.settleGameRoundConsumer = {
                    settleRound: jest.fn(),
                };
                cron.bot = {
                    run: jest.fn(),
                };
                cron.runningRoundInfoPublisher = {
                    publish: jest.fn(),
                };

                // Act
                await cron.proceed();

                // Assert
                expect(cron.runningRoundInfoPublisher.publish).toHaveBeenCalled();
            });
        });
    });
});
