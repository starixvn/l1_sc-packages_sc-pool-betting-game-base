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
});
