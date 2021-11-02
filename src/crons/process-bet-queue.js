import { Core } from "sc-game-base";

export class ProcessBetQueue extends Core.Crons.ProcessBetQueue {
    async upsertBet(player, roundId, bet, rate) {
        const configs = this.gameData.gameConfigs;
        const existingBetFilter = { uid: player.UID, phien: roundId };
        const existingBet = await this.betsRepository.findOne(existingBetFilter).exec();
        const { betChoice, amount } = bet;
        const baseAmount = amount * rate;
        if (existingBet) {
            existingBet.amount += amount;
            existingBet.totalAmount += amount;
            existingBet.baseAmount += baseAmount;

            await existingBet.save();
        } else {
            const newBet = {
                uid: player.UID,
                name: player.profile.name,
                phien: roundId,
                choice: betChoice,
                time: new Date(),
                odds: configs.odds,
            };
            const existingBetIncrement = { amount: amount, totalAmount: amount, baseAmount: baseAmount };

            if (player.session) {
                newBet.memberId = player.session.memberId;
                newBet.siteId = player.session.siteId;
                newBet.partnerId = player.session.partnerId;
                newBet.currency = player.session.currencyName;
                newBet.rate = rate;
            }

            await this.betsRepository.updateOne(
                existingBetFilter,
                { $inc: existingBetIncrement, $setOnInsert: newBet },
                { upsert: true, setDefaultsOnInsert: true }
            );

            if (!this.isTestAccount(player)) {
                this.gameData.betCount[betChoice] = (this.gameData.betCount[betChoice] ?? 0) + 1;
            }
        }
    }

    async insertBetLog(player, roundId, bet, rate) {
        const newBetLog = {
            uid: player.UID,
            name: player.profile.name,
            phien: roundId,
            time: new Date(),
            choice: bet.betChoice,
            amount: bet.amount,
            baseAmount: bet.amount * rate,
            freeBet: bet.freeBet,
            clientSentTime: bet.clientSentTime,
            receivedTime: bet.receivedTime,
        };

        if (player.session) {
            newBetLog.memberId = player.session.memberId;
            newBetLog.siteId = player.session.siteId;
            newBetLog.partnerId = player.session.partnerId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;
        }

        await this.betLogsRepository.create(newBetLog);
    }

    adjustTotalBets(player, bet, rate) {
        if (this.isTestAccount(player)) {
            const { betChoice, amount } = bet;

            this.gameData.totalTestBets[betChoice] = (this.gameData.totalTestBets[betChoice] ?? 0) + amount * rate;
        } else {
            super.adjustTotalBets(player, bet, rate);
        }
    }

    isTestAccount(player) {
        return player?.session?.isTestCurrency;
    }
}
