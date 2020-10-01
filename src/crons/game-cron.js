import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../event-consumers";

export default class GameCron extends Core.Cron.BaseGameCron {
    constructor({ definition, gameData, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(
            definition,
            gameData,
            settleGameRoundConsumer ?? new SettleGameRoundConsumer({ definition, gameData }),
            gameStatusPublisher,
            runningRoundInfoPublisher
        );
    }
}
