import { Core } from "sc-game-base";

export default class PlaceBetConsumer extends Core.BaseEventConsumers.PlaceBetConsumer {
    constructor({ definition, gameData, publisher }) {
        super(definition, gameData, publisher);
    }

    consume(player, payload) {
        Object.assign(payload, { amount: payload.amount >> 0 });

        const { amount, select } = payload;
        const name = player.profile.name;

        if (!this.validateBetRequest(player, this.convertBetChoice(select), amount)) {
            return;
        }

        if (!this.gameData.ingame[name]) {
            const newPlayer = {
                name: player.profile.name,
                betTracks: {},
                betQueue: [],
            };

            this.gameData.ingame[name] = newPlayer;
        }

        this.gameData.ingame[name].betQueue.push({ player, payload });
    }

    convertBetChoice(select) {
        return select ? 1 : 2;
    }
}
