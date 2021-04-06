import Chance from "chance";
import mongoose from "mongoose";
import { helpers } from "sc-common";
import { Core } from "sc-game-base";

import { GameData } from "../game-data";

export class Bot extends Core.Crons.BaseBot {
    /**
     * @param {Core.GameDefinition} definition
     * @param {GameData} gameData
     * @param {Core.BaseEventPublishers.BaseEventPublisher} publisher
     * @param {mongoose.Model} userInfosRepository
     * @param {mongoose.Model} betsRepository
     * @param {mongoose.Model} betLogsRepository
     */
    constructor(definition, gameData, publisher, userInfosRepository, betsRepository, betLogsRepository) {
        super(definition, gameData, publisher);

        this.userInfosRepository = userInfosRepository;
        this.betsRepository = betsRepository;
        this.betLogsRepository = betLogsRepository;

        this.chance = new Chance();
        this.botList = [];
        this.botBufferRatio = 20;
        this.ratioToStartBalancing = 2.2;
        this.balancingRatio = 80;
        this.totalSmallBotTickets = 0;
        this.totalUnroundTickets = 0;
        this.totalBotTickets = 0;

        this.smallTicketScale = 50;
        this.ratioOfSmallTicket = 70;
        this.ratioOfUnroundTicket = 70;
    }

    async reset() {
        const configs = this.gameData.gameConfigs;

        if (configs?.botenabled) {
            const bots = await this.userInfosRepository.find({ type: true, disabled: false, banned: false }, "id name").lean().exec();
            const maxBot = Math.floor(bots.length * helpers.configHelper.getMaxBotForCurrentHour(configs));

            this.botList = this.chance.shuffle(bots).slice(0, maxBot);
        } else {
            this.botList = [];
        }
    }

    resetAllBotData() {
        this.totalBotTickets = 0;
        this.totalUnroundTickets = 0;
        this.totalBotTickets = 0;
    }

    async run() {
        const { remainingTime, totalBets } = this.gameData;
        const { durations, choices } = this.definition;

        if (this.botList.length && remainingTime > durations.lockingBet) {
            const isNeedToBalance =
                (totalBets[choices[0]] || 0) / (totalBets[choices[1]] || 0) > this.ratioToStartBalancing ||
                (totalBets[choices[1]] || 0) / (totalBets[choices[0]] || 0) > this.ratioToStartBalancing;

            const maxTickets = this.getMaxTicketsToBet(remainingTime, durations);
            const betChoices = remainingTime < durations.balancingBetTime || isNeedToBalance ? this.generateBetChoicesToBalance(maxTickets) : [];

            await this.getBotsAndPlaceBet(maxTickets, betChoices);
        }
    }

    getMaxTicketsToBet(remainingTime, durations) {
        const maxBotRandom =
            remainingTime < durations.balancingBetTime
                ? (this.botList.length - (this.botList.length * this.botBufferRatio) / 100) / remainingTime
                : this.botList.length / (remainingTime - durations.lockingBet);

        return remainingTime < durations.balancingBetTime
            ? Math.floor(maxBotRandom)
            : this.chance.integer({ min: (maxBotRandom * 2) / 3, max: maxBotRandom });
    }

    generateBetChoicesToBalance(maxTickets) {
        const { totalBets } = this.gameData;
        const { choices } = this.definition;
        const ticketsForSmallestChoice = Math.round((maxTickets * this.balancingRatio) / 100);
        const select = (totalBets[choices[0]] || 0) < (totalBets[choices[1]] || 0);
        const result = [];

        for (let index = 0; index < ticketsForSmallestChoice; index++) {
            result.push(select ? choices[0] : choices[1]);
        }

        for (let index = ticketsForSmallestChoice; index < maxTickets; index++) {
            result.push(select ? choices[1] : choices[0]);
        }

        return this.chance.shuffle(result);
    }

    async getBotsAndPlaceBet(maxTickets, choices) {
        for (let index = 0; index < maxTickets; index++) {
            const bot = this.botList[index];

            if (bot) {
                await this.placeBet(bot, this.getBetChoice(index, choices));
            }
        }

        this.botList.splice(0, maxTickets);
    }

    async placeBet(bot, choice) {
        const minBet = this.getMinBet();
        const maxBet = this.getMaxBet();
        const isUnround = this.totalBotTickets === 0 ? false : (this.totalUnroundTickets * 100) / this.totalBotTickets < this.ratioOfUnroundTicket;
        const betAmount = this.getRandomAmount(minBet, maxBet, isUnround);
        const { roundId } = this.gameData;

        this.gameData.totalBets[choice] = (this.gameData.totalBets[choice] || 0) + betAmount;
        this.gameData.betCount[choice] = (this.gameData.totalBets[choice] || 0) + 1;

        await this.betLogsRepository.create({
            uid: bot.id,
            name: bot.name,
            phien: roundId,
            amount: betAmount,
            choice: choice,
            time: new Date(),
        });

        const update = { amount: betAmount };
        const create = { uid: bot.id, phien: roundId, choice: choice, time: new Date() };

        await this.betsRepository.updateOne(
            { uid: bot.id, phien: roundId },
            { $inc: update, $setOnInsert: create },
            { upsert: true, setDefaultsOnInsert: true }
        );

        if (this.isSmallTicket()) {
            this.totalSmallBotTickets++;
        }

        if (isUnround) {
            this.totalUnroundTickets++;
        }

        this.totalBotTickets++;
    }

    getRandomAmount(min, max, isUnround) {
        return isUnround ? Math.floor(this.chance.integer({ min, max }) / min) * min : helpers.numberHelper.getRandomNumberStep5(min, max, true);
    }

    getMaxBet() {
        const maxBet = this.gameData.gameConfigs?.bot_maxbet ?? 10;
        const minBet = this.getMinBet();

        if (this.isSmallTicket()) {
            const maxBetOfSmallTicket = Math.min(minBet * this.smallTicketScale, maxBet * 0.3);

            return Math.min(maxBetOfSmallTicket, maxBet);
        }

        return maxBet;
    }

    getBetChoice(index, choices) {
        return choices[index] ?? this.definition.choices[this.chance.integer({ min: 0, max: 1 })];
    }

    isSmallTicket() {
        return this.totalBotTickets === 0 ? true : (this.totalSmallBotTickets * 100) / this.totalBotTickets < this.ratioOfSmallTicket;
    }
}
