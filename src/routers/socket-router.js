import { logger } from "sc-common";
import { Core } from "sc-game-base";

import { PlaceBetConsumer } from "./../event-consumers";
import { RoundQuery } from "./../query-apis";

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
            roundQuery: roundQuery ?? new RoundQuery(definition),
        });
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

            if (!this.verify() || !roundId) {
                return;
            }

            const round = await this.roundQuery.getOne(roundId);

            this.socketClient.emit(this.definition.name, { round });
        } catch (error) {
            logger.logError(error);
        }
    }
}
