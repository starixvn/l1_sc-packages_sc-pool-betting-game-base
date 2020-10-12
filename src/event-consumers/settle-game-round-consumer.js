import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    constructor({ definition, gameData, mainServerApiSettings, roundResultPublisher, userBetResultPublisher }) {
        super(definition, gameData, mainServerApiSettings, roundResultPublisher, userBetResultPublisher);
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const bets = await this.queryBets(roundId);

        if (bets && bets.length) {
            const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
            const uusUserIds = uusUsers.map((user) => user.id);

            const realBets = bets.filter((bet) => !uusUserIds.includes(bet.uid));
            const realBetProcessors = this.settleBetsByGroup(realBets, roundId, settlementResult, this.gameData.totalBets);
            const uusBets = bets.filter((bet) => uusUserIds.includes(bet.uid));
            const uusBetProcessors = this.settleBetsByGroup(uusBets, roundId, settlementResult, this.gameData.totalUUSBets);

            await Promise.all(realBetProcessors.concat(uusBetProcessors));

            const settledBets = await this.querySettledBets(roundId);

            await Promise.all(
                settledBets.map(async (bet) => {
                    const betResult = this.calculateBetResult(bet);
                    await this.callEndGame(bet, roundId, time, betResult);
                    this.captureBetResult(bet.uid, betResult);
                    bet.memberId && this.userBetResultPublisher.publish(bet.uid, betResult);
                })
            );
        }

        this.roundResultPublisher.publishRoundResult(this.collectRoundResult(result, settlementResult, roundId));
    }

    calculateBetResult(bet) {
        const totalLost = bet.amount - bet.refund;
        const winAmount = bet.win ? bet.betwin + bet.amount : totalLost;

        return {
            totalBetAmount: bet.amount,
            totalWin: winAmount,
            totalLost: totalLost,
            winningByChoices: { [bet.choice]: winAmount },
        };
    }

    queryBets(roundId) {
        return this.definition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: 1 } }).exec();
    }

    querySettledBets(roundId) {
        return this.definition.betRepository.find({ phien: roundId, thanhtoan: true }).exec();
    }

    settleBetsByGroup(bets, roundId, settlementResult, totalBets) {
        const payout = {
            amount: Math.min(...Object.values(totalBets)),
        };

        return bets.map((bet) => this.settleBet(bet, roundId, settlementResult, payout));
    }

    async settleBet(bet, roundId, settlementResult, payout) {
        let betWin = 0;
        let refund = 0;
        const { choice, amount: betAmount } = bet;
        const isWinningBet = settlementResult[choice];

        bet.thanhtoan = true;
        bet.win = isWinningBet;

        if (payout.amount && isWinningBet) {
            const odd = this.gameData.gameConfigs.odds[choice];
            if (payout.amount >= betAmount) {
                betWin = this.calculateBetWin(betAmount, odd);
                payout.amount -= betAmount;
            } else {
                betWin = this.calculateBetWin(payout.amount, odd);
                refund = betAmount - payout.amount;
                payout.amount = 0;
            }
            bet.betwin = betWin;
        } else {
            refund = betAmount;
        }

        bet.refund = refund;
        await bet.save();
        await this.definition.betRepository.updateOne(
            { uid: bet.uid, phien: roundId },
            { $set: { win: isWinningBet, thanhtoan: true, time: new Date() }, $inc: { refund, betwin: betWin } }
        );
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }
}
