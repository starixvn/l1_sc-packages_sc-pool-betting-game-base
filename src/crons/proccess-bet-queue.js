import { Core } from "sc-game-base";

export default class ProcessBetQueue extends Core.Cron.ProcessBetQueue {
    constructor({ definition, gameData, publisher }) {
        super(definition, gameData, publisher);
    }

    async proceedBet(player, payload) {
        const betInfo = {
            amount: payload.amount,
            gameId: this.definition.id,
            gameRoundId: this.gameData.roundId,
            choiceId: this.definition.choicesMapper[payload.select],
        };

        const apiResult = await placeBetApi({ id: player.UID, session: player.session }, betInfo);

        if (apiResult.isOk) {
            await this.handleSuccessBet(player, apiResult.response, payload);
        } else {
            const insufficientNotice = helpers.noticeHelper.notEnoughMoney;
            const notice = apiResult.response.inSufficientBalance ? insufficientNotice : apiResult.response;

            this.handleFailedBet(player, notice);
        }
    }
}
