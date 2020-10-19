import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "./../event-consumers";
import { RunningRoundInfoPublisher } from "./../event-publishers";
import Bot from "./bot";

export default class GameCron extends Core.Cron.BaseGameCron {
    constructor({ definition, gameData, bot, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(
            definition,
            gameData,
            bot ?? new Bot(definition, gameData),
            settleGameRoundConsumer ?? new SettleGameRoundConsumer({ definition, gameData }),
            gameStatusPublisher,
            runningRoundInfoPublisher ?? new RunningRoundInfoPublisher(definition.name, gameData)
        );
    }

    resetForNewRound() {
        super.resetForNewRound();
        this.gameData.betCount = {};
        this.gameData.totalUUSBets = {};
    }
}
