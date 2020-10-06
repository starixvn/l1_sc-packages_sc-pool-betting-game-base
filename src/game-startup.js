import { Core } from "sc-game-base";

import { GameCron, ProcessBetQueue } from "./crons";
import { SocketRouter } from "./routers";

export default class GameStartUp extends Core.BaseStartup {
    constructor({ appConfigs, definition, gameData, gameCron, processBetQueue }) {
        super(
            appConfigs,
            definition,
            gameData,
            gameCron ?? new GameCron({ definition, gameData, apiSettings: appConfigs.apiSettings }),
            processBetQueue ?? new ProcessBetQueue({ definition, gameData })
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
