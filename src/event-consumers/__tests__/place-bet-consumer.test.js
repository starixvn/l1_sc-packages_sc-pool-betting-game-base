import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { PlaceBetConsumer } from "../place-bet-consumer";

describe("PlaceBetConsumer test", () => {
    const gameData = new GameData(0);
    const playerName = "nhanvat01";
    const player = {
        profile: {
            name: playerName,
        },
        session: {
            currency: "US",
        },
    };
    gameData.ingame = {
        [playerName]: {
            betTracks: {
                odd: 100,
            },
        },
    };
    const configs = {
        enableFreeBet: false,
        minbet: 1,
        maxBet: 5000,
    };
    gameData.gameConfigs = configs;
    const publisher = stub(Core.BaseEventPublishers.BaseEventPublisher);

    /** @type {mongoose.Model}*/
    const currencyGroupGamesRepository = stubMongooseModelStupidly(mongoose.Model);

    const consumer = new PlaceBetConsumer({ choices: ["odd", "even"] }, gameData, publisher, currencyGroupGamesRepository);
    beforeEach(() => {
        spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "composeValidationCriteria");
    });

    it("inherit Core.BaseEventConsumers.PlaceBetConsumer", () => {
        expect(consumer instanceof Core.BaseEventConsumers.PlaceBetConsumer).toBeTruthy();
    });

    describe("composeValidationCriteria", () => {
        beforeEach(() => {
            Core.BaseEventConsumers.PlaceBetConsumer.prototype.composeValidationCriteria = jest.fn(() => [{ failure: true, notice: "" }]);
            consumer.composeValidationCriteria(player, "odd", 100, false, 1);
        });

        it("_always_calls super.composeValidationCriteria", () => {
            expect(Core.BaseEventConsumers.PlaceBetConsumer.prototype.composeValidationCriteria).toHaveBeenCalled();
        });
    });

    it("composeBetAmountValidationCriteria_validBet_passed", async () => {
        currencyGroupGamesRepository.findOne().lean().exec.mockReturnValue({ minBet: 1, maxBet: 2000 });

        const actualResult = await consumer.composeBetAmountValidationCriteria(player, "odd", 100, false, 1);

        expect(actualResult.find((criteria) => criteria.failure)).toBeFalsy();
    });
});
