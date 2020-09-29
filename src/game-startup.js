import { Core } from "sc-game-base";

import { GameCron, ProcessBetQueue } from "./crons";

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
}
