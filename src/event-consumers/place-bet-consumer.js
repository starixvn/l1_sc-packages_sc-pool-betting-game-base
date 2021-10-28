import { helpers } from "sc-common";
import { Core } from "sc-game-base";

import notices from "./../constants/notices";

export class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    async composeValidationCriteria(player, betChoice, amount, freeBet, roundId) {
        const baseCriteria = await super.composeValidationCriteria(player, betChoice, amount, freeBet, roundId);

        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const criteria = [
            {
                failure: Object.keys(betTracks).filter((key) => key !== betChoice && betTracks[key] > 0).length > 0,
                notice: this.getNoticeObj(notices.oneChoiceAllowed),
            },
        ];

        return baseCriteria.concat(criteria);
    }

    async composeBetAmountValidationCriteria(player, betChoice, amount, freeBet) {
        const settings = await this.currencyGroupGamesRepository.findOne({ groupId: player.session.currencyGroupId }, "minBet maxBet").lean().exec();

        const configs = this.gameData.gameConfigs;
        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const totalAmount = this.definition.choices.reduce((total, choice) => total + (betTracks[choice] || 0), 0) + amount;
        const minBet = Math.max(player.profile.minBet, settings.minBet);
        const maxBet = Math.min(player.profile.maxBet, settings.maxBet);

        return [
            {
                failure: freeBet && !configs.enableFreeBet,
                notice: this.getNoticeObj(helpers.noticeHelper.invalidBet),
            },
            {
                failure: amount < minBet,
                notice: this.getNoticeObj(helpers.noticeHelper.minBet, { minBet }),
            },
            {
                failure: amount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
            {
                failure: totalAmount > maxBet,
                notice: this.getNoticeObj(helpers.noticeHelper.maxBet, { maxBet }),
            },
        ];
    }
}
