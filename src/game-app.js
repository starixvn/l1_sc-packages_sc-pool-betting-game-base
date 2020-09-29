import { Core } from "sc-game-base";

import GameStartUp from "./game-startup";

export default class GameApp extends Core.BaseGameApp {
    constructor({ appConfigs, definition, gameData, startup }) {
        super(appConfigs, definition, gameData, startup ?? new GameStartUp({ appConfigs, gameDefinition, gameData }));
    }
}
