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

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);

const roundQuery = new RoundQuery(roundsRepository, betLogsRepository, currencyRepository, exchangeRatesRepository, userInfosRepository);

describe("RoundQuery", () => {
    it("should inherit Core.QueryApis.RoundQuery", () => {
        expect(roundQuery instanceof Core.QueryApis.RoundQuery).toBeTruthy();
    });

    describe("getRound", () => {
        const round = {
            exchangeRateId: 1,
        };
        beforeAll(() => {
            // Arrange
            spyOn(Core.QueryApis.RoundQuery.prototype, "getOne").and.returnValue(round);

            const betLogs = [
                { uid: 1, choice: "odd", amount: 10 },
                { uid: 3, choice: "odd", amount: 20 },
            ];
            betLogsRepository.find().lean().exec.mockReturnValue(betLogs);

            const exchangeRates = {
                exId: 1,
                code: {
                    $US: 1,
                },
            };
            exchangeRatesRepository.findOne().lean().exec.mockReturnValue(exchangeRates);
        });

        describe("when playerRate is invalid", () => {
            // Arrange
            const playerSession = {
                multiplier: 0,
                currencyCode: "$US",
            };

            it("should return round info & empty object total", async () => {
                // Act
                const actualResult = await roundQuery.getRound(1, playerSession);

                // Assert
                expect(actualResult).toEqual({ ...round, total: {} });
            });
        });

        describe("when playerRate is valid", () => {
            beforeAll(async () => {
                // Arrange
                const playerSession = {
                    multiplier: 1,
                    currencyCode: "$US",
                };

                currencyRepository.find().lean().exec.mockReturnValue([]);
                userInfosRepository.find().lean().exec.mockReturnValue([]);
                betLogsRepository.find().lean().exec.mockReturnValue([]);

                // Act
                await roundQuery.getRound(1, playerSession);
            });

            it("should call get test currencies", () => {
                // Assert
                expect(currencyRepository.find().lean().exec).toHaveBeenCalled();
            });

            it("should call get userInfos", () => {
                // Assert
                expect(userInfosRepository.find().lean().exec).toHaveBeenCalled();
            });

            it("should call get betLogs", () => {
                // Assert
                expect(betLogsRepository.find().lean().exec).toHaveBeenCalled();
            });
        });
    });

    describe("convertBetLogs", () => {
        it("should return input bet logs", () => {
            // Arrange
            const betLogs = [{ id: 1 }];

            // Act
            const actualValue = roundQuery.convertBetLogs(betLogs);

            // Assert
            expect(actualValue).toStrictEqual(betLogs);
        });
    });
});
