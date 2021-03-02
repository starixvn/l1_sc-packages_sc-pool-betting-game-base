import { stub } from "jest-micro-auto-stub";
import { Core } from "sc-game-base";

import GameApp from "../game-app";
import GameData from "../game-data";
import GameStartUp from "../game-startup";

jest.mock("sc-game-base");

describe("game app test", () => {
    const appConfigs = {};
    const definition = new Core.GameDefinition({ id: 1, name: "game-name" });
    const gameData = new GameData(0);
    const startup = stub(GameStartUp);
    const gameApp = new GameApp({ appConfigs, definition, gameData, startup });

    it("inherit BaseGameApp", () => {
        expect(gameApp instanceof Core.BaseGameApp);
    });
});
