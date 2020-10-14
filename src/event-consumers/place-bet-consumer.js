import { Core } from "sc-game-base";

import notices from "./../constants/notices";

export default class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    constructor({ definition, gameData, publisher }) {
        super(definition, gameData, publisher);
    }

    composeValidationCriteria(player, betChoice, amount, freeBet) {
        const baseCriteria = super.composeValidationCriteria(player, betChoice, amount, freeBet);

        const { betTracks } = this.gameData.ingame[player.profile.name] || { betTracks: {} };
        const criteria = [
            {
                failure: Object.keys(betTracks).length && !(betChoice in betTracks),
                notice: notices.oneChoiceAllowed,
            },
        ];

        return criteria.concat(baseCriteria);
    }
}
