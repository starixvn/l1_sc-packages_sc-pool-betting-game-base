import { logger } from "sc-common";
import { Core } from "sc-game-base";

export class SocketRouter extends Core.Routers.BaseSocketRouter {
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
