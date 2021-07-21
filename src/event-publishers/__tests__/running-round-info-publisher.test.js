import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { RunningRoundInfoPublisher } from "../running-round-info-publisher";

describe("RunningRoundInfoPublisher test", () => {
    const gameData = new GameData(0);
    gameData.betCount = { odd: 10, even: 10 }
    const publisher = new RunningRoundInfoPublisher("game name", gameData);

    beforeEach(() => {
        spyOn(Core.BaseEventPublishers.RunningRoundInfoPublisher.prototype, "publish");
    });

    it("inherit Core.BaseEventPublishers.RunningRoundInfoPublisher", () => {
        expect(publisher instanceof Core.BaseEventPublishers.RunningRoundInfoPublisher).toBeTruthy();
    });

    describe("publish_", () => {
        beforeEach(() => {
            publisher.publish();
        });

        it("always_calls super.publish", () => {
            expect(Core.BaseEventPublishers.RunningRoundInfoPublisher.prototype.publish).toHaveBeenCalled();
        })
    })
});
