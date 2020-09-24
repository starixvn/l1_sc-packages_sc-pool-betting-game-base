import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    async queryBets(roundId) {
        return await this.gameDefinition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: -1 } }).exec();
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const bets = this.queryBets(roundId);

        if (bets && bets.length) {
            const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
            const uusUserIds = uusUsers.map((user) => user.id);

            const normalBets = bets.filter((bet) => !uusUserIds.includes(bet.uid));

            const uusBets = bets.filter((bet) => uusUserIds.includes(bet.uid));
        }
    }

    settleBetsByGroup() {
        const sum = {
            totalBetLeftStake: 0,
            totalBetRightStake: 0,
        };
    }
}
