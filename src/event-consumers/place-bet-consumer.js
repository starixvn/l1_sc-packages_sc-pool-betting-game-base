import { helpers } from "sc-common";
import { Core } from "sc-game-base";

import notices from "./../constants/notices";

export class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    composeValidationCriteria(player, betChoice, amount, freeBet) {
        const baseCriteria = super.composeValidationCriteria(player, betChoice, amount, freeBet);

        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const criteria = [
            {
                failure: Object.keys(betTracks).filter((key) => key !== betChoice && betTracks[key] > 0).length > 0,
                notice: this.getNoticeObj(notices.oneChoiceAllowed),
            },
        ];

        return baseCriteria.concat(criteria);
    }

    composeBetAmountValidationCriteria(player, betChoice, amount, freeBet) {
        const configs = this.gameData.gameConfigs;
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const totalAmount = this.definition.choices.reduce((total, choice) => total + (betTracks[choice] || 0), 0) + amount;

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: amount < configs.minbet,
                notice: this.getNoticeObj(helpers.noticeHelper.minBet),
            },
            {
                failure: amount > configs.maxbet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet),
            },
            {
                failure: totalAmount > configs.maxbet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet),
            },
        ];
    }
}
