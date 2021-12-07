import { Core } from "sc-game-base";

export class GameData extends Core.GameData {
    constructor(remainingTime) {
        super(remainingTime);
        this.betList = [];
        this.totalTestBets = {};
        this.betCount = {};
    }
}
