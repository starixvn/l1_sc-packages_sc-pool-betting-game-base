import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    constructor({ definition, gameData, roundResultPublisher, userBetResultPublisher }) {
        super(definition, gameData, roundResultPublisher, userBetResultPublisher);
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

                    if (bet.memberId) {
                        this.userBetResultPublisher.publish(bet.uid, betResult);
                    }
                })
            );
        }

        this.roundResultPublisher.publishRoundResult(this.collectRoundResult(result, settlementResult, roundId));
    }

    calculateBetResult(bet) {
        const winAmount = bet.win ? bet.betwin + bet.amount : bet.refund;
        const lostAmount = bet.amount - bet.refund;

        return {
            totalBetAmount: bet.amount,
            totalWin: winAmount,
            totalLost: lostAmount,
            winningByChoices: { [bet.choice]: winAmount },
        };
    }

    queryBets(roundId) {
        return this.definition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: -1 } }).exec();
    }

    querySettledBets(roundId) {
        return this.definition.betRepository.find({ phien: roundId, thanhtoan: true }).lean().exec();
    }

    settleBetsByGroup(bets, roundId, settlementResult, totalBets) {
        const { choices } = this.definition;
        const refundChoice = (totalBets[choices[0]] ?? 0) > (totalBets[choices[1]] ?? 0) ? choices[0] : choices[1];
        const refundAmount = Math.abs((totalBets[choices[0]] ?? 0) - (totalBets[choices[1]] ?? 0));
        const refundInfo = {
            choice: refundChoice,
            amount: refundAmount,
        };

        return bets.map((bet) => this.settleBet(bet, roundId, settlementResult, refundInfo));
    }

    async settleBet(bet, roundId, settlementResult, refundInfo) {
        const { choice, amount: betAmount } = bet;
        const isWinningBet = settlementResult[choice];
        const odd = this.gameData.gameConfigs.odds[choice];
        let betWin = 0;
        let refund = 0;

        bet.thanhtoan = true;
        bet.win = isWinningBet;

        if (refundInfo.amount && bet.choice === refundInfo.choice) {
            if (refundInfo.amount >= betAmount) {
                refund = betAmount;
                refundInfo.amount -= betAmount;
            } else {
                refund = refundInfo.amount;

                if (isWinningBet) {
                    betWin = this.calculateBetWin(betAmount - refundInfo.amount, odd);
                }

                refundInfo.amount = 0;
            }
        } else if (isWinningBet) {
            betWin = this.calculateBetWin(bet.amount, odd);
        }

        bet.refund = refund;
        bet.betwin = betWin;
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
