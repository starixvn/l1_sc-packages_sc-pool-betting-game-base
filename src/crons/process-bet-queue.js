import { Core } from "sc-game-base";

export class ProcessBetQueue extends Core.Crons.ProcessBetQueue {
    async upsertBet(player, roundId, bet, rate) {
        const configs = this.gameData.gameConfigs;
        const existingBetFilter = { uid: player.UID, phien: roundId };
        const existingBet = await this.betsRepository.findOne(existingBetFilter).exec();

        if (existingBet) {
            await this.updateBet(existingBet, bet, rate);
        } else {
            await this.insertBet(player, bet, roundId, configs, rate);

            if (!this.isTestAccount(player)) {
                this.gameData.betCount[bet.betChoice] = (this.gameData.betCount[bet.betChoice] ?? 0) + 1;
            }
        }
    }

    async insertBet(player, bet, roundId, configs, rate) {
        const existingBetFilter = { uid: player.UID, phien: roundId };
        const newBet = {
            uid: player.UID,
            name: player.profile.name,
            phien: roundId,
            choice: bet.betChoice,
            time: new Date(),
            odds: configs.odds,
            roundId,
        };
        const existingBetIncrement = { amount: bet.amount, totalAmount: bet.amount, baseAmount: bet.amount * rate };

        if (player.session) {
            newBet.memberId = player.session.memberId;
            newBet.siteId = player.session.siteId;
            newBet.partnerId = player.session.partnerId;
            newBet.currency = player.session.currencyName;
            newBet.rate = rate;

            newBet.operatorId = player.session.partnerId;
            newBet.playerId = player.session.memberId;
        }

        await this.betsRepository.updateOne(
            existingBetFilter,
            { $inc: existingBetIncrement, $setOnInsert: newBet },
            { upsert: true, setDefaultsOnInsert: true }
        );
    }

    async updateBet(existingBet, bet, rate) {
        existingBet.amount += bet.amount;
        existingBet.totalAmount += bet.amount;
        existingBet.baseAmount += bet.amount * rate;
        await existingBet.save();
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
            roundId,
        };

        if (player.session) {
            newBetLog.memberId = player.session.memberId;
            newBetLog.siteId = player.session.siteId;
            newBetLog.partnerId = player.session.partnerId;
            newBetLog.currency = player.session.currencyName;
            newBetLog.rate = rate;

            newBetLog.operatorId = player.session.partnerId;
            newBetLog.playerId = player.session.memberId;
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

    isCountOnTotalBets(player) {
        return true;
    }
}
