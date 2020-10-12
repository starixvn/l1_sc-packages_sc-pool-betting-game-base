import Chance from "chance";
import { userInfos } from "sc-base-database";
import { helpers } from "sc-common";
import { Core } from "sc-game-base";

export default class Bot extends Core.BaseBot {
    constructor(definition, gameData, publisher) {
        super(definition, gameData, publisher);

        this.chance = new Chance();
        this.botList = [];
        this.botBufferRatio = 20;
        this.ratioToStartBalancing = 2.2;
        this.balancingRatio = 80;
        this.totalSmallBotTickets = 0;
        this.totalUnroundTickets = 0;
        this.totalBotTickets = 0;
        this.smallTicketScale = 50;
    }

    async reset() {
        const configs = this.gameData.gameConfigs;

        if (configs?.botenabled) {
            const bots = await userInfos.find({ type: true, disabled: false }, "id name").exec();

            let maxBot = Math.floor(bots.length * helpers.configHelper.getMaxBotForCurrentHour(configs));
            this.botList = this.chance.shuffle(bots).slice(0, maxBot);
        } else {
            this.botList = [];
        }
    }

    async run() {
        if (this.botList.length) {
            const { remainingTime, totalBets } = this.gameData;
            const { durations, choices } = this.definition;

            const maxBotRandom =
                remainingTime < durations.balancingBetTime
                    ? (this.botList.length - (this.botList.length * this.botBufferRatio) / 100) / remainingTime
                    : this.botList.length / (remainingTime - durations.lockingBet);

            const maxTickets =
                remainingTime < durations.balancingBetTime
                    ? Math.floor(maxBotRandom)
                    : this.chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });

            const isNeedToBalance =
                (totalBets[choices[0]] || 0) / (totalBets[choices[1]] || 0) > this.ratioToStartBalancing ||
                (totalBets[choices[1]] || 0) / (totalBets[choices[0]] || 0) > this.ratioToStartBalancing;

            const betChoices = remainingTime < durations.balancingBetTime || isNeedToBalance ? this.generateBetChoices(maxTickets) : [];

            this.getBotsAndPlaceBet(maxTickets, betChoices);
        }
    }

    generateBetChoices(maxTickets) {
        let choices = [];
        const { totalBets } = this.gameData;

        const ticketsForSmallestChoice = (maxTickets * this.balancingRatio) / 100;

        for (let index = 0; index < ticketsForSmallestChoice; index++) {
            choices.push(Object.keys(totalBets).reduce((prev, current) => (totalBets[current] < totalBets[prev] ? current : prev)));
        }

        for (let index = ticketsForSmallestChoice; index < maxTickets; index++) {
            choices.push(Object.keys(totalBets).reduce((prev, current) => (totalBets[current] > totalBets[prev] ? current : prev)));
        }

        return this.chance.shuffle(choices);
    }

    getBotsAndPlaceBet(maxTickets, choices) {
        const maxBet = this.gameData.gameConfigs?.bot_maxbet ?? 10;
        const minBet = this.getMinBet();
        for (let index = 0; index < maxTickets; index++) {
            const bot = this.botList[index];
            if (bot) {
                this.placeBet(bot, maxBet, minBet, choices[index] ?? this.definition.choices[Math.floor(Math.random() * 2)]);
            }
        }

        this.botList.splice(0, maxTickets);
    }

    async placeBet(bot, maxBet, minBet, choice) {
        const isSmallTicket =
            this.totalBotTickets == 0 ? true : (this.totalSmallBotTickets * 100) / this.totalBotTickets < this.ratioOfSmallTicket;
        const isUnround =
            this.totalBotTickets == 0 ? false : (this.totalUnroundTickets * 100) / this.totalBotTickets < this.ratioOfUnroundTicket;

        if (isSmallTicket) {
            let maxBetOfSmallTicket = Math.min(minBet * this.smallTicketScale, maxBet * 0.3);
            maxBet = Math.min(maxBetOfSmallTicket, maxBet);
        }

        const betAmount = this.getRandomAmount(minBet, maxBet, isUnround);
        this.gameData.totalBets[choice] = (this.gameData.totalBets[choice] || 0) + betAmount;
        this.gameData.betCount[choice] = (this.gameData.totalBets[choice] || 0) + 1;
        const { roundId } = this.gameData;

        await this.definition.betLogRepository({
            uid: bot.id,
            name: bot.name,
            phien: roundId,
            amount: betAmount,
            choice: choice,
            time: new Date(),
        });

        const update = { amount: betAmount };
        const create = { uid: bot.id, phien: roundId, choice: choice, time: new Date() };

        await this.definition.betRepository.updateOne(
            { uid: bot.id, phien: roundId },
            { $inc: update, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
        );

        this.totalBotTickets++;

        if (isSmallTicket) {
            this.totalSmallBotTickets++;
        }

        if (isUnround) {
            this.totalUnroundTickets++;
        }
    }

    getRandomAmount(min, max, isUnround) {
        if (isUnround) return Math.floor(Math.random() * max) + min;

        return helpers.numberHelper.getRandomNumberStep5(min, max, true);
    }
}
