import { Core } from "sc-game-base";

import GameStartUp from "./game-startup";

export default class GameApp extends Core.BaseGameApp {
    constructor({ appConfigs, gameDefinition, gameData, startup }) {
        super(appConfigs, gameDefinition, gameData, startup ?? new GameStartUp({ appConfigs, gameDefinition, gameData }));
    }
}
