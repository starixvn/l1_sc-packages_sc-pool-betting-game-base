import { Core } from "sc-game-base";

import { PlaceBetConsumer } from "../event-consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    constructor({
        definition,
        gameData,
        userSignInConsumer,
        userDisconnectConsumer,
        inGameConsumer,
        placeBetConsumer,
        userSignInPublisher,
        historyQuery,
        roundQuery,
    }) {
        super({
            definition,
            gameData,
            userSignInConsumer,
            userDisconnectConsumer,
            inGameConsumer,
            placeBetConsumer: placeBetConsumer ?? new PlaceBetConsumer({ definition, gameData }),
            userSignInPublisher,
            historyQuery,
            roundQuery,
        });
    }
}
