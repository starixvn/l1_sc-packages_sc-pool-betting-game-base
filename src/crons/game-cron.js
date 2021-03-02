import { Core } from "sc-game-base";

export class GameCron extends Core.Crons.BaseGameCron {
    constructor({ definition, gameData, bot, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(definition, gameData, bot, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher);
    }

    resetForNewRound() {
        super.resetForNewRound();
        this.gameData.betCount = {};
        this.gameData.totalUUSBets = {};
    }
}
