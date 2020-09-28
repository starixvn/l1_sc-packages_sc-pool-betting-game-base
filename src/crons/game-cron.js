import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../event-consumers";

export default class GameCron extends Core.Cron.BaseGameCron {
    constructor({ gameDefinition, gameData, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(
            gameDefinition,
            gameData,
            settleGameRoundConsumer ?? new SettleGameRoundConsumer({ gameDefinition, gameData }),
            gameStatusPublisher,
            runningRoundInfoPublisher
        );
    }
}
