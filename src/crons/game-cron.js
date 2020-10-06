import { Core } from "sc-game-base";

import { SettleGameRoundConsumer } from "../event-consumers";

export default class GameCron extends Core.Cron.BaseGameCron {
    constructor({ definition, gameData, mainServerApiSettings, settleGameRoundConsumer, gameStatusPublisher, runningRoundInfoPublisher }) {
        super(
            definition,
            gameData,
            mainServerApiSettings,
            settleGameRoundConsumer ?? new SettleGameRoundConsumer({ definition, gameData, mainServerApiSettings }),
            gameStatusPublisher,
            runningRoundInfoPublisher
        );
    }
}
