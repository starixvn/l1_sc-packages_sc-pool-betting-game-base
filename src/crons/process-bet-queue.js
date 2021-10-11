import { Core } from "sc-game-base";

export class ProcessBetQueue extends Core.Crons.ProcessBetQueue {
    async upsertBet(player, roundId, bet) {
        const configs = this.gameData.gameConfigs;
        const existingBetFilter = { uid: player.UID, phien: roundId };
        const existingBet = await this.betsRepository.findOne(existingBetFilter).exec();
        if (existingBet) {
            await this.updateBet(existingBet, bet);
        } else {
            await this.insertBet(player, bet, roundId, configs);

            if (!this.isUUSAccount(player)) {
                this.gameData.betCount[bet.betChoice] = (this.gameData.betCount[bet.betChoice] ?? 0) + 1;
            }
        }
    }

    async insertBet(player, bet, roundId, configs) {
        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            phien: roundId,
            choice: bet.betChoice,
            time: new Date(),
            odds: configs.odds,
            amount: bet.amount,
            totalAmount: bet.amount,
        };

        if (player.session) {
            newBet.memberId = player.session.memberId;
            newBet.siteId = player.session.siteId;
        }

        await this.betsRepository.create(newBet);
    }

    async updateBet(existingBet, bet) {
        existingBet.amount += bet.amount;
        existingBet.totalAmount += bet.amount;
        await existingBet.save();
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
