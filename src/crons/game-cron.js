import { Core } from "sc-game-base";

export class GameCron extends Core.Crons.BaseGameCron {
    resetForNewRound() {
        super.resetForNewRound();
        this.gameData.betCount = {};
        this.gameData.totalTestBets = {};
    }
}
