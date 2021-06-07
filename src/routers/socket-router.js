import { Core } from "sc-game-base";

export class SocketRouter extends Core.Routers.BaseSocketRouter {
    constructor({
        definition,
        gameData,
        userSignInConsumer,
        inGameConsumer,
        placeBetConsumer,
        userDisconnectConsumer,
        userSignInPublisher,
        historyQuery,
        logService,
        roundQuery,
    }) {
        super({
            definition,
            gameData,
            userSignInConsumer,
            inGameConsumer,
            placeBetConsumer,
            userDisconnectConsumer,
            userSignInPublisher,
            historyQuery,
            logService,
        });

        this.roundQuery = roundQuery;
    }
    /**
     * @param {SocketIO.Socket} socketClient
     */
    init(socketClient) {
        super.init(socketClient);

        socketClient.on("getRound", this.handleGetRound.bind(this));
    }

    async handleGetRound(payload) {
        try {
            const { roundId } = payload;

            if (!this.verify() || !roundId || roundId >= this.gameData.roundId) {
                return;
            }

            const round = await this.roundQuery.getOne(roundId);

            this.socketClient.emit(this.definition.name, { round });
        } catch (error) {
            this.logService.logError(error);
        }
    }
}
