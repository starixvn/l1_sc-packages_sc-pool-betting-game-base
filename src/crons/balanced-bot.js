import Chance from "chance";
import { Core } from "sc-game-base";

export class BalancedBot extends Core.Crons.BaseBot {
    constructor(definition, gameData, publisher, userInfosRepository, betsRepository, betLogsRepository, logService, appConfigs) {
        super(definition, gameData, publisher);

        this.userInfosRepository = userInfosRepository;
        this.betsRepository = betsRepository;
        this.betLogsRepository = betLogsRepository;
        this.logService = logService;
        this.appConfigs = appConfigs;
        this.chance = new Chance();
        this.botList = [];
    }

    async reset() {
        try {
            if (this.gameData.gameConfigs?.smartBotGroupRatio > 0) {
                const bots = await this.userInfosRepository.find({ type: true, disabled: false, banned: false }, "id name").lean().exec();
                this.botList = this.chance.shuffle(bots).slice(0, 200);
            }
        } catch (e) {
            this.logService.logError(e);
        }
    }

    checkRandomBet() {
        const ratio = this.gameData.gameConfigs?.smartBotGroupRatio ?? 0;
        const toBetItems = Array(ratio * 100).fill(true);
        const notToBetItems = Array(100 - ratio * 100).fill(false);
        const toBet = this.getRandomFromArray(toBetItems.concat(notToBetItems));

        return toBet;
    }

    getRandomBetAmount(remainingAmount, totalAmount) {
        if (remainingAmount <= 10) {
            return remainingAmount;
        }

        let minBet = Math.round(totalAmount / 3);
        let maxBet = this.gameData.gameConfigs?.maxbet ?? 10;

        if (minBet > remainingAmount) {
            minBet = remainingAmount;
        }
        if (maxBet > remainingAmount) {
            maxBet = remainingAmount;
        }
        if (minBet > maxBet) {
            minBet = maxBet;
        }

        return this.chance.integer({ min: minBet, max: maxBet });
    }

    getExtraAmount() {
        const minBet = this.getMinBet();
        const random = this.chance.integer({ min: 0, max: 10 });
        return minBet * random;
    }

    getRandomBot() {
        this.botList = this.botList.filter((bot) => !this.gameData.usedBots.includes(bot.id));
        if (this.botList.length) {
            const bot = this.botList.shift();
            return bot;
        } else {
            this.logService.logError("no available balanced bot!");
            return null;
        }
    }

    getRandomFromArray(array) {
        const randomIndex = this.chance.integer({ min: 0, max: array.length - 1 });
        return array[randomIndex];
    }

    async run(userBet) {
        try {
            const bettingTime = this.appConfigs?.balancedBotBettingTime ?? 10;
            const { remainingTime, totalBets } = this.gameData;
            const { choices } = this.definition;
            const { betChoice } = userBet;
            const oppositeChoice = betChoice === choices[0] ? choices[1] : choices[0];
            const totalBetOnOpposite = totalBets[oppositeChoice] || 0;

            if (this.botList.length && remainingTime < bettingTime && totalBets[betChoice] > totalBetOnOpposite && this.checkRandomBet()) {
                const betOnSimilarChoiceAmount = this.getExtraAmount();
                const betOnOppositeChoiceAmount = totalBets[betChoice] - totalBetOnOpposite + this.getExtraAmount();
                await this.placeBet(oppositeChoice, betOnOppositeChoiceAmount);
                await this.placeBet(betChoice, betOnSimilarChoiceAmount);
            }
        } catch (e) {
            this.logService.logError(e);
        }
    }

    async placeBet(choice, totalAmount) {
        let remainingAmount = totalAmount;
        for (let i = 1; i <= 3 && remainingAmount > 0; i++) {
            const betAmount = this.getRandomBetAmount(remainingAmount, totalAmount);
            remainingAmount = remainingAmount - betAmount;

            const bot = this.getRandomBot();
            if (bot) {
                this.gameData.totalBets[choice] = (this.gameData.totalBets[choice] || 0) + betAmount;
                this.gameData.betCount[choice] = (this.gameData.betCount[choice] || 0) + 1;
                await this.inserBetLog(bot, choice, betAmount);
                await this.upsertBet(bot, choice, betAmount);
            }
        }
    }

    async inserBetLog(bot, choice, betAmount) {
        const { roundId } = this.gameData;

        await this.betLogsRepository.create({
            uid: bot.id,
            name: bot.name,
            amount: betAmount,
            baseAmount: betAmount,
            rate: this.botRate,
            choice: choice,
            time: new Date(),
            roundId,
        });
    }

    async upsertBet(bot, choice, betAmount) {
        const { roundId } = this.gameData;

        const update = { amount: betAmount, baseAmount: betAmount * this.botRate };
        const create = { uid: bot.id, choice: choice, time: new Date(), rate: this.botRate, roundId };

        await this.betsRepository.updateOne(
            { uid: bot.id, roundId },
            { $inc: update, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }
}
