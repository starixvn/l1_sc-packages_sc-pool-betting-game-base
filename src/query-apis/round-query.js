import { Core } from "sc-game-base";

export class RoundQuery extends Core.QueryApis.RoundQuery {
    /**
     * @param {mongoose.Model} roundsRepository
     * @param {mongoose.Model} betLogsRepository
     * @param {mongoose.Model} currencyRepository
     */
    constructor(roundsRepository, betLogsRepository, currencyRepository) {
        super(roundsRepository);

        this.betLogsRepository = betLogsRepository;
        this.currencyRepository = currencyRepository;
    }

    convertBetLogs(betLogs) {
        return betLogs;
    }

    async getOne(id, projections = { _id: false }) {
        const round = await super.getOne(id, projections);
        const testCurrencies = await this.currencyRepository.find({ isTest: true }, "name partnerId").lean().exec();

        const betLogs = await this.betLogsRepository
            .find({ phien: id }, { _id: false }, { sort: { _id: 1 } })
            .lean()
            .exec();

        const convertedBetLogs = this.convertBetLogs(betLogs);

        const betLogGroups = convertedBetLogs
            .filter((betLog) => !testCurrencies.some((currency) => currency.name === betLog.currency && currency.partnerId === betLog.partnerId))
            .reduce((accumulator, currentBetLog) => {
                accumulator[currentBetLog.choice] = accumulator[currentBetLog.choice] ?? [];
                accumulator[currentBetLog.choice].push(currentBetLog);

                return accumulator;
            }, {});

        const total = {};

        Object.keys(betLogGroups).forEach((choice) => {
            total[choice] = betLogGroups[choice].reduce(
                (result, log) => {
                    result.betAmount += (log.baseAmount ?? log.amount);
                    result.refund += (log.baseRefund ?? log.refund);

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
