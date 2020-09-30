import { Core } from "sc-game-base";

import { PlaceBetConsumer } from "../event-consumers";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    constructor({
        gameDefinition,
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
            gameDefinition,
            gameData,
            userSignInConsumer,
            userDisconnectConsumer,
            inGameConsumer,
            placeBetConsumer: placeBetConsumer ?? new PlaceBetConsumer({ gameDefinition, gameData }),
            userSignInPublisher,
            historyQuery,
            roundQuery,
        });
    }
}
