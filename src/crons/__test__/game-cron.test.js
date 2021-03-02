import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { GameCron } from "../game-cron";

describe("game cron test", () => {
    const definition = new Core.GameDefinition({ id: 1, name: "game-name" });
    const gameData = new GameData(0);
    const cron = new GameCron({ definition, gameData });

    it("inherit BaseGameCron", () => {
        expect(cron instanceof Core.Crons.BaseGameCron);
    });
});
