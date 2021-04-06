import { Core } from "sc-game-base";

export class RoundQuery extends Core.QueryApis.RoundQuery {
    /**
     * @param {mongoose.Model} roundsRepository 
     * @param {mongoose.Model} userInfosRepository 
     * @param {mongoose.Model} betLogsRepository 
     */
    constructor(roundsRepository, userInfosRepository, betLogsRepository) {
        super(roundsRepository);

        this.userInfosRepository = userInfosRepository
        this.betLogsRepository = betLogsRepository;
    }

    async getOne(id, projections = { _id: false }) {
        const round = await super.getOne(id, projections);
        const uusUsers = await this.userInfosRepository.find({ currency: "UUS" }, "id").lean().exec();
        const uusUserIds = uusUsers.map((user) => user.id);
        const betLogs = await this.betLogsRepository.find({ phien: id }, { _id: false }, { sort: { _id: 1 } }).lean().exec();

        const betLogGroups = betLogs
            .filter((betLog) => !uusUserIds.includes(betLog.uid))
            .reduce((accumulator, currentBetLog) => {
                accumulator[currentBetLog.choice] = accumulator[currentBetLog.choice] ?? [];
                accumulator[currentBetLog.choice].push(currentBetLog);

                return accumulator;
            }, {});

        const total = {};

        Object.keys(betLogGroups).forEach((choice) => {
            total[choice] = betLogGroups[choice].reduce(
                (result, log) => {
                    result.betAmount += log.amount;
                    result.refund += log.refund;

                    return result;
                },
                {
                    betAmount: 0,
                    refund: 0,
                }
            );
        });

        return {
            ...round,
            ...betLogGroups,
            total,
        };
    }
}
