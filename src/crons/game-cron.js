import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../event-consumers";

export default class GameCron extends Core.Cron.BaseGameCron {
    constructor({ definition, gameData, apiSettings, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(
            definition,
            gameData,
            apiSettings,
            settleGameRoundConsumer ?? new SettleGameRoundConsumer({ definition, gameData }),
            gameStatusPublisher,
            runningRoundInfoPublisher
        );
    }
}
