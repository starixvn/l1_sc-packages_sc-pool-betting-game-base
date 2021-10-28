import { Core } from "sc-game-base";

export class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    constructor({
        definition,
        gameData,
        roundResultPublisher,
        userBetResultPublisher,
        endGame,
        roundsRepository,
        betsRepository,
        betLogsRepository,
        userInfosRepository,
        currenciesRepository,
    }) {
        super({ definition, gameData, roundResultPublisher, userBetResultPublisher, endGame, roundsRepository, betsRepository });

        this.betLogsRepository = betLogsRepository;
        this.userInfosRepository = userInfosRepository;
        this.currenciesRepository = currenciesRepository;
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const bets = await this.queryBets(roundId);

        if (bets && bets.length) {
            const testCurrencies = await this.currenciesRepository.find({ isTest: true }, "name partnerId").lean().exec();

            const realBets = bets.filter(
                (bet) => !testCurrencies.some((currency) => currency.name === bet.currency && currency.partnerId === bet.partnerId)
            );
            const realBetProcessors = this.settleBetsByGroup(realBets, roundId, settlementResult, this.gameData.totalBets);

            const testBets = bets.filter((bet) =>
                testCurrencies.some((currency) => currency.name === bet.currency && currency.partnerId === bet.partnerId)
            );
            const testBetProcessors = this.settleBetsByGroup(testBets, roundId, settlementResult, this.gameData.totalUUSBets);

            await Promise.all(realBetProcessors.concat(testBetProcessors));

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
        return this.betLogsRepository.find({ phien: roundId }, null, { sort: { _id: -1 } }).exec();
    }

    querySettledBets(roundId) {
        return this.betsRepository.find({ phien: roundId, thanhtoan: true }).lean().exec();
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
        const { choice, baseAmount: betAmount } = bet;
        const isWinningBet = settlementResult[choice];
        const odd = this.gameData.gameConfigs.odds[choice];
        let baseBetWin = 0;
        let baseRefund = 0;

        bet.thanhtoan = true;
        bet.win = isWinningBet;

        if (refundInfo.amount && bet.choice === refundInfo.choice) {
            if (refundInfo.amount >= betAmount) {
                baseRefund = betAmount;
                refundInfo.amount -= betAmount;
            } else {
                baseRefund = refundInfo.amount;

                if (isWinningBet) {
                    baseBetWin = this.calculateBetWin(betAmount - refundInfo.amount, odd);
                }

                refundInfo.amount = 0;
            }
        } else if (isWinningBet) {
            baseBetWin = this.calculateBetWin(bet.amount, odd);
        }

        const refund = (baseRefund / bet.rate).toFixed(4);
        const betWin = (baseBetWin / bet.rate).toFixed(4);

        bet.baseRefund = baseRefund;
        bet.baseBetWin = baseBetWin;
        bet.refund = refund;
        bet.betwin = betWin;
        await bet.save();

        await this.betsRepository.updateOne(
            { uid: bet.uid, phien: roundId },
            { $set: { win: isWinningBet, thanhtoan: true, time: new Date() }, $inc: { refund, betwin: betWin, baseRefund, baseBetWin } }
        );
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }
}
