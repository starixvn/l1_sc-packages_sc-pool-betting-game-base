import { asClass, asValue } from "awilix";
import { Core } from "sc-game-base";

import { Bot, GameCron, ProcessBetQueue } from "./crons";
import { PlaceBetConsumer, SettleGameRoundConsumer } from "./event-consumers";
import { RunningRoundInfoPublisher } from "./event-publishers";
import { Currencies } from "./models";
import { RoundQuery } from "./query-apis";
import { SocketRouter } from "./routers";

export class ContainerRegistry extends Core.ContainerRegistry {
    registerApis() {
        super.registerApis();
        this.container.register({
            roundQuery: asClass(RoundQuery).singleton(),
        });
    }

    registerModels() {
        super.registerModels();

        this.container.register({
            currenciesRepository: asValue(Currencies),
        });
    }

    registerPublishers() {
        super.registerPublishers();

        this.container.register({
            runningRoundInfoPublisher: asClass(RunningRoundInfoPublisher).singleton(),
        });
    }

    registerConsumers() {
        super.registerConsumers();

        this.container.register({
            placeBetConsumer: asClass(PlaceBetConsumer).singleton(),
            settleGameRoundConsumer: asClass(SettleGameRoundConsumer).singleton().proxy(),
        });
    }

    registerCrons() {
        super.registerCrons();

        this.container.register({
            bot: asClass(Bot).singleton(),
            gameCron: asClass(GameCron).singleton().proxy(),
            processBetQueue: asClass(ProcessBetQueue).singleton().proxy(),
        });
    }

    registerRouters() {
        super.registerRouters();

        this.container.register({
            socketRouter: asClass(SocketRouter).proxy(),
        });
    }
}
