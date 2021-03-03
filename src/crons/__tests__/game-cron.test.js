import { stub } from "jest-micro-auto-stub";
import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../../event-consumers";
import { RunningRoundInfoPublisher } from "../../event-publishers";
import { GameData } from "../../game-data";
import { Bot } from "../bot";
import { GameCron } from "../game-cron";

describe("game cron test", () => {
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

    it("inherit BaseGameCron", () => {
        expect(cron instanceof Core.Crons.BaseGameCron);
    });

    it("resetForNewRound_always_call super", () => {
        // arrange
        spyOn(Core.Crons.BaseGameCron.prototype, "resetForNewRound");

        // act
        cron.resetForNewRound();

        // assert
        expect(Core.Crons.BaseGameCron.prototype.resetForNewRound).toHaveBeenCalled();
        expect(gameData.betCount).toEqual({});
    });
});
