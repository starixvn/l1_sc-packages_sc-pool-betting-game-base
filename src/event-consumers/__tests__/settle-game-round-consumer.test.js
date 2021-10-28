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
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const currenciesRepository = stubMongooseModelStupidly(mongoose.Model);

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
        userInfosRepository,
        currenciesRepository,
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
            const bet = { uid: 1, amount: 200, baseAmount: 2000, choice: "even", save: jest.fn() };
            const refundInfo = {
                choice: "even",
                amount: 300,
            };

            // act
            await consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
        });

        it("refundAmount greater than betAmount_calls update bet", () => {
            // arrange
            const bet = { uid: 1, amount: 200, choice: "even", save: jest.fn() };
            const refundInfo = {
                choice: "even",
                amount: 100,
            };

            // act
            consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
        });

        it("no refund_calls update bet", () => {
            // arrange
            const bet = { uid: 1, amount: 200, choice: "even", save: jest.fn() };
            const refundInfo = {};

            // act
            consumer.settleBet(bet, 1, settlementResult, refundInfo);

            // asset
            expect(bet.save).toHaveBeenCalled();
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
            const users = [
                { id: 1, name: "user1", currency: "UUS" },
                { id: 2, name: "user2", currency: "UUS" },
            ];
            const bets = [
                { uid: 1, odd: 100, save: jest.fn() },
                { uid: 3, even: 200, save: jest.fn() },
            ];
            const settleBets = [
                { uid: 1, odd: 100, thanhtoan: true, memberId: 123, save: jest.fn() },
                { uid: 3, even: 200, thanhtoan: true, memberId: 456, save: jest.fn() },
            ];
            consumer.queryBets = jest.fn(() => bets);
            consumer.settleBetsByGroup = jest.fn(() => settleBets);

            userInfosRepository.find().lean().exec.mockReturnValue(users);
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
});

afterEach(() => {
    jest.clearAllMocks();
});
