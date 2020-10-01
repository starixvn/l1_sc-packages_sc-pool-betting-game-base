import { Core } from "sc-game-base";

export default class ProcessBetQueue extends Core.Cron.ProcessBetQueue {
    constructor({ definition, gameData, publisher }) {
        super(definition, gameData, publisher);
    }

    async insertOrUpdateBet(player, bet) {
        const existingBetFilter = { uid: player.UID, phien: this.gameData.roundId };
        const existingBet = await this.definition.betRepository.findOne(existingBetFilter).exec();

        if (existingBet) {
            existingBet.amount += bet.amount;
            await existingBet.save();
        } else {
            const newBet = {
                uid: player.UID,
                name: player.profile.name,
                phien: this.gameData.roundId,
                choice: bet.betChoice,
                time: new Date(),
            };
            const existingBetIncrement = { amount: bet.amount };

            if (player.session) {
                newBet.memberId = player.session.memberId;
                newBet.siteId = player.session.siteId;
            }

            await this.definition.betRepository.updateOne(
                existingBetFilter,
                { $inc: existingBetIncrement, $setOnInsert: newBet },
                { upsert: true, setDefaultsOnInsert: true }
            );
        }
    }

    adjustTotalBets(player, bet) {
        const isUUSAccount = player?.session?.currency?.toUpperCase() === "UUS";

        if (isUUSAccount) {
            const { betChoice, amount } = bet;
            this.gameData.totalUUSBets[betChoice] = (this.gameData.totalUUSBets[betChoice] ?? 0) + amount;
        } else {
            super.adjustTotalBets(player, bet);
        }
    }
}
