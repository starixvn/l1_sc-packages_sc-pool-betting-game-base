import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class RoundQuery extends Core.QueryApis.RoundQuery {
    async getOne(id, projections = { _id: false }) {
        const round = await super.getOne(id, projections);
        const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
        const uusUserIds = uusUsers.map((user) => user.id);
        const betLogs = await this.definition.betLogRepository.find({ phien: id }, { _id: false }, { sort: { _id: 1 } }).exec();

        const betLogGroups = betLogs
            .filter((betLog) => !uusUserIds.includes(betLog.uid))
            .reduce((accumulator, currentBetLog) => {
                accumulator[currentBetLog.choice] = [...(accumulator[currentBetLog.choice] || []), currentBetLog];
                return accumulator;
            }, {});

        const total = Object.entries(betLogGroups).reduce(
            (result, [choice, logs]) => {
                const totalAmount = logs.reduce((amount, log) => amount + log.amount, 0);
                result.betAmount[choice] = (result.betAmount[choice] || 0) + totalAmount;

                return result;
            },
            {
                betAmount: {},
                refund: {},
            }
        );

        return {
            ...round,
            ...betLogGroups,
            total,
        };
    }
}
