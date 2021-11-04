import { stub, stubMongooseModelStupidly } from "jest-micro-auto-stub";
import mongoose from "mongoose";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { Bot } from "../bot";

const definition = { id: 1, name: "game name", durations: { lockingBet: 5 }, choices: ["odd", "even"] };
const gameData = new GameData(30);
gameData.totalBets = { odd: 200, even: 50 };

const publisher = stub(Core.BaseEventPublishers.BaseEventPublisher);

/** @type {mongoose.Model}*/
const userInfosRepository = stubMongooseModelStupidly(mongoose.Model);

/** @type {mongoose.Model}*/
const betsRepository = stubMongooseModelStupidly(mongoose.Model);
betsRepository.updateOne = jest.fn();

/** @type {mongoose.Model}*/
const betLogsRepository = stubMongooseModelStupidly(mongoose.Model);

const bot = new Bot(definition, gameData, publisher, userInfosRepository, betsRepository, betLogsRepository);

describe("bot tests", () => {
    it("inherit_Core.Crons.BaseBot", () => {
        expect(bot instanceof Core.Crons.BaseBot).toBeTruthy();
    });

    it("run_not existing bot_do not call getBotsAndPlaceBet", () => {
        bot.botList = [];
        spyOn(bot, "getBotsAndPlaceBet");
        bot.run();

        expect(bot.getBotsAndPlaceBet).not.toHaveBeenCalled();
    });

    it("run_existing bot_call getBotsAndPlaceBet", async () => {
        bot.botList = [{ id: 1 }];
        spyOn(bot, "getBotsAndPlaceBet");
        await bot.run();

        expect(bot.getBotsAndPlaceBet).toHaveBeenCalled();
    });

    it("resetAllBotData", () => {
        // arrange
        bot.totalBotTickets = 10;
        bot.totalUnroundTickets = 20;
        bot.totalBotTickets = 30;

        // act
        bot.resetAllBotData();

        // asset
        expect(bot.totalBotTickets).toEqual(0);
        expect(bot.totalUnroundTickets).toEqual(0);
        expect(bot.totalBotTickets).toEqual(0);
    });

    it("placeBet", () => {
        const user = { id: 1, name: "bot" };
        spyOn(betsRepository, "updateOne");

        bot.placeBet(user, "odd");

        expect(betLogsRepository.create).toHaveBeenCalled();
    });

    it("reset_bot disabled_reset botList", () => {
        bot.reset();

        expect(bot.botList).toEqual([]);
    });

    it("reset_bot enabled_reset botList", () => {
        gameData.gameConfigs = { botenabled: true };
        userInfosRepository.find().lean().exec.mockReturnValue([]);
        bot.reset();

        expect(userInfosRepository.find().lean().exec).toHaveBeenCalled();
    });
});
