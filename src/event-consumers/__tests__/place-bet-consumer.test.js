import { stub } from "jest-micro-auto-stub";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { PlaceBetConsumer } from "../place-bet-consumer";

describe("PlaceBetConsumer", () => {
    // Arrange
    const gameData = new GameData(0);
    const playerName = "nhanvat01";
    const player = {
        profile: {
            name: playerName,
        },
        session: {
            currency: "US",
            currencyGroupId: "1",
        },
    };
    gameData.ingame = {
        [playerName]: {
            betTracks: {
                odd: 100,
            },
        },
    };
    gameData.currencyGroupGames = [
        {
            groupId: 1,
            minBet: 1,
            maxBet: 2000,
            maxBetPerChoices: [],
        },
    ];
    const configs = {
        enableFreeBet: false,
        minbet: 1,
        maxBet: 5000,
    };
    gameData.gameConfigs = configs;
    const publisher = stub(Core.BaseEventPublishers.BaseEventPublisher);

    const consumer = new PlaceBetConsumer({ choices: ["odd", "even"] }, gameData, publisher);
    beforeEach(() => {
        spyOn(Core.BaseEventConsumers.PlaceBetConsumer.prototype, "composeValidationCriteria");
    });

    it("should inherit Core.BaseEventConsumers.PlaceBetConsumer", () => {
        // Assert
        expect(consumer instanceof Core.BaseEventConsumers.PlaceBetConsumer).toBeTruthy();
    });

    describe("composeValidationCriteria", () => {
        beforeEach(() => {
            Core.BaseEventConsumers.PlaceBetConsumer.prototype.composeValidationCriteria = jest.fn(() => [{ failure: true, notice: "" }]);
            consumer.composeValidationCriteria(player, "odd", 100, false, 1);
        });

        it("should call super.composeValidationCriteria", () => {
            // Assert
            expect(Core.BaseEventConsumers.PlaceBetConsumer.prototype.composeValidationCriteria).toHaveBeenCalled();
        });
    });

    describe("composeBetAmountValidationCriteria", () => {
        describe("when bet is valid", () => {
            it("should all criteria passed", () => {
                // Act
                const actualResult = consumer.composeBetAmountValidationCriteria(player, "odd", 100, false);

                // Assert
                expect(actualResult.find((criteria) => criteria.failure)).toBeFalsy();
            });
        });
    });
});
