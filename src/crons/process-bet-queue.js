import { Core } from "sc-game-base";

export default class ProcessBetQueue extends Core.Cron.ProcessBetQueue {
    constructor({ definition, gameData, publisher }) {
        super(definition, gameData, publisher);
    }

    adjustTotalBets(player, bet) {
        const isUUSAccount = player.session && player.session.currency && player.session.currency.toUpperCase() === "UUS";

        if (isUUSAccount) {
            const { betChoice, amount } = bet;
            this.gameData.totalUUSBets[betChoice] = (this.gameData.totalUUSBets[betChoice] ?? 0) + amount;
        } else {
            super.adjustTotalBets(player, bet);
        }
    }
}
