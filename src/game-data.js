import { Core } from "sc-game-base";

export default class GameData extends Core.GameData {
    constructor(remainingTime, totalBets, commission) {
        super(remainingTime, totalBets);
        this.commission = commission;
        this.betList = [];
        this.totalUUSBets = {};
    }
}
