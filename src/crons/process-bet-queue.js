import { Core } from "sc-game-base";

export class ProcessBetQueue extends Core.Crons.ProcessBetQueue {
    async upsertBet(player, roundId, bet) {
        const existingBetFilter = { uid: player.UID, phien: roundId };

        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            phien: roundId,
            choice: bet.betChoice,
            time: new Date(),
        };
        const existingBetIncrement = { amount: bet.amount, totalAmount: bet.amount };

        if (player.session) {
            newBet.memberId = player.session.memberId;
            newBet.siteId = player.session.siteId;
        }

        await this.betsRepository.updateOne(
            existingBetFilter,
            { $inc: existingBetIncrement, $setOnInsert: newBet },
            { upsert: true, setDefaultsOnInsert: true }
        );

        if (!this.isUUSAccount(player)) {
            this.gameData.betCount[bet.betChoice] = (this.gameData.betCount[bet.betChoice] ?? 0) + 1;
        }
    }

    adjustTotalBets(player, bet) {
        if (this.isUUSAccount(player)) {
            const { betChoice, amount } = bet;

            this.gameData.totalUUSBets[betChoice] = (this.gameData.totalUUSBets[betChoice] ?? 0) + amount;
        } else {
            super.adjustTotalBets(player, bet);
        }
    }

    isUUSAccount(player) {
        return player?.session?.currency?.toUpperCase() === "UUS";
    }
}
