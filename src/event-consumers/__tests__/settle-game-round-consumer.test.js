import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { SettleGameRoundConsumer } from "../settle-game-round-consumer";

const definition = { choices: ["odd", "even"] };
const gameConfigs = { odds: { odd: 1.98, even: 1.98 } };
const gameData = new GameData(0);
gameData.gameConfigs = gameConfigs;

const roundResultPublisher = stub(Core.BaseEventPublishers.RoundResultPublisher);

const userBetResultPublisher = stub(Core.BaseEventPublishers.UserBetResultPublisher);

const endGame = jest.fn();

const settlementResult = { odd: false, even: true };

/** @type {mongoose.Model}*/
const roundsRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betsRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betLogsRepository = { find: () => {} };

/** @type {mongoose.Model}*/
const currencyRepository = stubMongooseModelStupidly(mongoose.Model);

describe("SettleGameRoundConsumer test", () => {
    const consumer = new SettleGameRoundConsumer({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        endGame,
        roundsRepository,
        betsRepository,
        betLogsRepository,
        currencyRepository,
    });

    beforeEach(() => {
        spyOn(roundResultPublisher, "publishRoundResult");
    });

    it("queryBets_always_return correct result", async () => {
        // arrange
        const realPlayerBets = [{ round: 1, choice: "odd", amount: 10 }];
        spyOn(betLogsRepository, "find").and.callFake(() => {
            return {
                exec: () => {
                    return realPlayerBets;
                },
            };
        });

        // act
        const actualResult = await consumer.queryBets(1);

        // assert
        expect(actualResult).toEqual(realPlayerBets);
    });

    it("querySettledBets correct result", async () => {
        // arrange
        const realPlayerBets = [{ round: 1, choice: "odd", amount: 10 }];
        betsRepository.find().lean().exec.mockReturnValueOnce(realPlayerBets);

        // act
        const actualResult = await consumer.querySettledBets(1);

        // assert
        expect(actualResult).toEqual(realPlayerBets);
    });

    describe("settleBet_", () => {
        it("refundAmount greater than betAmount_calls update bet", async () => {
            // arrange
            const bet = { uid: 1, amount: 200, baseAmount: 200, choice: "even", baseRefund: 0, rate: 1, save: jest.fn() };
            const refundInfo = {
                choice: "even",
                amount: 300,
            };

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // assert
            expect(bet.save).toHaveBeenCalled();
            expect(betsRepository.updateOne).toHaveBeenCalledWith(expect.anything(), {
                $set: expect.anything(),
                $inc: {
                    refund: bet.baseRefund.toFixed(4),
                    totalWin: bet.baseRefund.toFixed(4),
                    baseBetWin: 0,
                    baseRefund: bet.baseRefund,
                    baseTotalWin: bet.baseRefund,
                    betwin: "0.0000",
                },
            });
        });

        it("refundAmount less than betAmount_calls update bet", async () => {
            // arrange
            const bet = { uid: 1, amount: 200, baseAmount: 200, choice: "even", rate: 1, refund: 0, baseRefund: 0, save: jest.fn() };
            const refundInfo = {
                choice: "even",
                amount: 100,
            };
            const odds = gameData.gameConfigs.odds[bet.choice];
            const expectedBetWin = consumer.calculateBetWin(bet.amount - refundInfo.amount, odds);
            const expectedTotalWin = expectedBetWin + refundInfo.amount + (bet.amount - refundInfo.amount);

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
            expect(betsRepository.updateOne).toHaveBeenCalledWith(expect.anything(), {
                $set: expect.anything(),
                $inc: {
                    refund: bet.refund,
                    totalWin: expectedTotalWin.toFixed(4),
                    baseBetWin: expectedBetWin,
                    baseRefund: bet.baseRefund,
                    baseTotalWin: expectedTotalWin,
                    betwin: (expectedBetWin / bet.rate).toFixed(4),
                },
            });
        });

        it("no refund_calls update bet", async () => {
            // arrange
            const bet = { uid: 1, amount: 200, baseAmount: 200, choice: "even", rate: 1, refund: 0, baseRefund: 0, save: jest.fn() };
            const refundInfo = {};
            const odds = gameData.gameConfigs.odds[bet.choice];
            const expectedBetWin = consumer.calculateBetWin(bet.baseAmount, odds);
            const expectedTotalWin = expectedBetWin + bet.baseAmount;

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
            expect(betsRepository.updateOne).toHaveBeenCalledWith(expect.anything(), {
                $set: expect.anything(),
                $inc: {
                    refund: bet.refund,
                    totalWin: expectedTotalWin.toFixed(4),
                    baseBetWin: expectedBetWin,
                    baseRefund: bet.baseRefund,
                    baseTotalWin: expectedTotalWin,
                    betwin: (expectedBetWin / bet.rate).toFixed(4),
                },
            });
        });

        it("loose and no refund_calls update bet", async () => {
            // arrange
            const bet = { uid: 1, amount: 200, baseAmount: 200, choice: "odd", rate: 1, refund: 0, baseRefund: 0, save: jest.fn() };
            const refundInfo = {
                choice: "odd",
                amount: 100,
            };
            const expectedBetWin = 0;
            const expectedTotalWin = 100;

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
            expect(betsRepository.updateOne).toHaveBeenCalledWith(expect.anything(), {
                $set: expect.anything(),
                $inc: {
                    refund: bet.refund,
                    totalWin: expectedTotalWin.toFixed(4),
                    baseBetWin: expectedBetWin,
                    baseRefund: bet.baseRefund,
                    baseTotalWin: expectedTotalWin,
                    betwin: (expectedBetWin / bet.rate).toFixed(4),
                },
            });
        });

        it("loose partially and refund_calls update bet", async () => {
            // arrange
            const bet = { uid: 1, amount: 200, baseAmount: 200, choice: "odd", rate: 1, refund: 0, baseRefund: 0, save: jest.fn() };
            const refundInfo = {};
            const expectedBetWin = 0;
            const expectedTotalWin = 0;

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
            expect(betsRepository.updateOne).toHaveBeenCalledWith(expect.anything(), {
                $set: expect.anything(),
                $inc: {
                    refund: bet.refund,
                    totalWin: expectedTotalWin.toFixed(4),
                    baseBetWin: expectedBetWin,
                    baseRefund: bet.baseRefund,
                    baseTotalWin: expectedTotalWin,
                    betwin: (expectedBetWin / bet.rate).toFixed(4),
                },
            });
        });
    });

    it("settleBetsByGroup_always_calls settleBet", () => {
        // arrange
        const bets = [
            { uid: 1, round: 1, amount: 100, choice: "odd", save: jest.fn() },
            { uid: 3, round: 1, amount: 200, choice: "even", save: jest.fn() },
        ];

        consumer.settleBet = jest.fn();
        const totalBets = { odd: 100, even: 200 };

        // act
        consumer.settleBetsByGroup(bets, 1, settlementResult, totalBets);

        // assert
        expect(consumer.settleBet).toHaveBeenCalled();
    });

    it("calculateBetWin_always_returns correct value", () => {
        // arrange
        const betAmount = 1;
        const odd = 1.98;
        const expectedResult = 0.98;

        // act
        const actualResult = consumer.calculateBetWin(betAmount, odd);

        // assert
        expect(actualResult).toEqual(expectedResult);
    });

    describe("settleBets", () => {
        beforeEach(() => {
            const bets = [
                { uid: 1, odd: 100, save: jest.fn(), partnerId: "OW", currency: "$US" },
                { uid: 3, even: 200, save: jest.fn(), partnerId: "OW", currency: "UUS" },
            ];
            const settleBets = [
                { uid: 1, odd: 100, thanhtoan: true, memberId: 123, save: jest.fn() },
                { uid: 3, even: 200, thanhtoan: true, memberId: 456, save: jest.fn() },
            ];
            const testCurrencies = [{ name: "UUS", partnerId: "OW" }];
            currencyRepository.find().lean().exec.mockReturnValueOnce(testCurrencies);
            consumer.queryBets = jest.fn(() => bets);
            consumer.settleBetsByGroup = jest.fn(() => settleBets);
            consumer.querySettledBets = jest.fn(() => settleBets);
            consumer.callEndGame = jest.fn();
        });

        it("_always_calls settleBets", () => {
            // act
            consumer.settleBets({
                result: { dice1: 1, dice2: 2, dice3: 3 },
                settlementResult: { odd: true, even: false },
                roundId: 1,
                time: Date.now(),
            });

            // assert
            expect(consumer.queryBets).toHaveBeenCalled();
        });
    });

    describe("formatEndGameInfo", () => {
        it("should return result with correct format", () => {
            const roundId = 123;
            const time = new Date();
            const bet = { freeBet: false, memberId: "432", partnerId: "OW", currency: "$US" };
            const betResult = {
                totalBetAmount: 100,
                totalWin: 150,
                totalLost: 0,
                netWin: 50,
            };

            const actualResult = consumer.formatEndGameInfo(bet, roundId, time, betResult);

            expect(actualResult).toEqual({
                gameInfo: {
                    gameRoundId: roundId,
                    memberId: bet.memberId,
                    siteId: bet.siteId,
                    partnerId: bet.partnerId,
                    time: time,
                    operatorId: bet.operatorId,
                },
                settlementInfo: {
                    redPlay: betResult.totalBetAmount,
                    freeBet: bet.freeBet,
                    red: betResult.totalWin,
                    validBetAmount: betResult.totalLost,
                    redLost: betResult.totalLost,
                    redWin: betResult.netWin,
                },
            });
        });

        it("should return undefined settlementInfo red when total win <= 0", () => {
            const roundId = 123;
            const time = new Date();
            const bet = { freeBet: false, memberId: "432", partnerId: "OW", currency: "$US" };
            const betResult = {
                totalBetAmount: 100,
                totalWin: 0,
                totalLost: 100,
                netWin: 0,
            };

            const actualResult = consumer.formatEndGameInfo(bet, roundId, time, betResult);

            expect(actualResult.red).toBeUndefined();
        });

        it("should return undefined settlementInfo redWin when total win <= 0", () => {
            const roundId = 123;
            const time = new Date();
            const bet = { freeBet: false, memberId: "432", partnerId: "OW", currency: "$US" };
            const betResult = {
                totalBetAmount: 100,
                totalWin: 0,
                totalLost: 100,
                netWin: 0,
            };

            const actualResult = consumer.formatEndGameInfo(bet, roundId, time, betResult);

            expect(actualResult.redWin).toBeUndefined();
        });

        it("should return undefined settlementInfo validBetAmount & undefined settlementInfo redLost when total lost < 0", () => {
            const roundId = 123;
            const time = new Date();
            const bet = { freeBet: false, memberId: "432", partnerId: "OW", currency: "$US" };
            const betResult = {
                totalBetAmount: 100,
                totalWin: 2,
                totalLost: -1,
            };

            const actualResult = consumer.formatEndGameInfo(bet, roundId, time, betResult);

            expect(actualResult.red).toBeUndefined();
        });
    });
});

afterEach(() => {
    jest.clearAllMocks();
});
