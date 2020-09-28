import { Core } from "sc-game-base";

export default class SocketRouter extends Core.Routers.BaseSocketRouter {
    constructor({
        definition,
        gameData,
        userSignInConsumer,
        userDisconnectConsumer,
        placeBetConsumer,
        userSignInPublisher,
        historyQuery,
        roundQuery,
    }) {
        super(
            definition,
            gameData,
            userSignInConsumer,
            userDisconnectConsumer,
            placeBetConsumer,
            userSignInPublisher,
            historyQuery,
            roundQuery
        );
    }
}
