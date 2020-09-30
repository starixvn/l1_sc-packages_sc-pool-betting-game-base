import { Core } from "sc-game-base";

import { GameCron, ProcessBetQueue } from "./crons";
import { SocketRouter } from "./routers";

export default class GameStartUp extends Core.BaseStartup {
    constructor({ appConfigs, gameDefinition, gameData, gameCron, processBetQueue }) {
        super(
            appConfigs,
            gameDefinition,
            gameData,
            gameCron ?? new GameCron({ gameDefinition, gameData }),
            processBetQueue ?? new ProcessBetQueue({ gameDefinition, gameData })
        );
    }

    /**
     * @param {socketIo.Socket} socketClient
     */
    initSocketRouter(socketClient) {
        const router = new SocketRouter({ definition: this.definition, gameData: this.gameData });
        router.init(socketClient);
    }
}
