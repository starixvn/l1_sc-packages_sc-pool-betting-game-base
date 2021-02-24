import { stub } from "jest-micro-auto-stub";
import { MongooseAutoIncrementID } from "mongoose-auto-increment-reworked";
import { Core } from "sc-game-base";

import GameApp from "../game-app";
import GameData from "../game-data";
import GameStartUp from "../game-startup";

jest.mock("sc-game-base");
jest.mock("mongoose-auto-increment-reworked");

describe("game app test", () => {
    beforeEach(() => {
        MongooseAutoIncrementID.mockClear();
    });
    const appConfigs = {};
    const definition = new Core.GameDefinition({ id: 1, name: "game-name" });
    const gameData = new GameData(0);
    const startup = stub(GameStartUp);
    const gameApp = new GameApp({ appConfigs, definition, gameData, startup });
    MongooseAutoIncrementID.plugin.mockReturnValue(jest.fn());

    it("inherit BaseGameApp", () => {
        expect(gameApp instanceof Core.BaseGameApp);
    });
});
