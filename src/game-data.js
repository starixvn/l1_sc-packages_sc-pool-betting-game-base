import { Core } from "sc-game-base";

export default class GameData extends Core.GameData {
    constructor(remainingTime) {
        super(remainingTime);
        this.betList = [];
        this.totalUUSBets = {};
    }
}
