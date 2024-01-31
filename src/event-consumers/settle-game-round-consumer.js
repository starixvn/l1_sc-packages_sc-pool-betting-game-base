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
        currencyRepository,
    }) {
        super({ definition, gameData, roundResultPublisher, userBetResultPublisher, endGame, roundsRepository, betsRepository });

        this.betLogsRepository = betLogsRepository;
        this.currencyRepository = currencyRepository;
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const bets = await this.queryBets(roundId);

        if (bets && bets.length) {
            const testCurrencies = await this.currencyRepository.find({ isTest: true }, "name partnerId").lean().exec();

            const realBets = bets.filter(
                (bet) => !testCurrencies.some((currency) => currency.name === bet.currency && currency.partnerId === bet.operatorId)
            );
            const realBetProcessors = this.settleBetsByGroup(realBets, roundId, settlementResult, this.gameData.totalBets);

            const testBets = bets.filter((bet) =>
                testCurrencies.some((currency) => currency.name === bet.currency && currency.partnerId === bet.operatorId)
            );
            const testBetProcessors = this.settleBetsByGroup(testBets, roundId, settlementResult, this.gameData.totalTestBets);

            await Promise.all(realBetProcessors.concat(testBetProcessors));

            const settledBets = await this.querySettledBets(roundId);

            await Promise.all(
                settledBets.map(async (bet) => {
                    const betResult = this.calculateBetResult(bet);

                    await this.callEndGame(bet, roundId, time, betResult);
                    this.captureBetResult(bet.uid, betResult);

                    if (bet.playerId) {
                        this.userBetResultPublisher.publish(bet.uid, betResult);
                    }
                })
            );
        }
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

    formatEndGameInfo(bet, roundId, time, betResult) {
        const gameInfo = {
            gameId: this.definition.id,
            gameRoundId: roundId,
            siteId: bet.siteId,
            time: time,
            operatorId: bet.operatorId,
            playerId: bet.playerId,
        };
        const settlementInfo = {
            redPlay: betResult.totalBetAmount,
            freeBet: bet.freeBet,
        };

        if (betResult.totalWin > 0) {
            settlementInfo.red = betResult.totalWin;
        }

        if (betResult.netWin > 0) {
            settlementInfo.redWin = betResult.netWin;
        }

        if (betResult.totalLost >= 0) {
            settlementInfo.redLost = betResult.totalLost;
            settlementInfo.validBetAmount = betResult.totalLost;
        }

        return { gameInfo, settlementInfo };
    }

    queryBets(roundId) {
        return this.betLogsRepository.find({ roundId }, null, { sort: { _id: -1 } }).exec();
    }

    querySettledBets(roundId) {
        return this.betsRepository.find({ roundId, paid: true }).lean().exec();
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
        const { choice, baseAmount } = bet;
        const isWinningBet = settlementResult[choice];
        const odd = this.gameData.gameConfigs.odds[choice];
        let baseBetWin = 0;
        let baseRefund = 0;

        bet.paid = true;
        bet.win = isWinningBet;

        if (refundInfo.amount && bet.choice === refundInfo.choice) {
            if (refundInfo.amount >= baseAmount) {
                baseRefund = baseAmount;
                refundInfo.amount -= baseAmount;
            } else {
                baseRefund = refundInfo.amount;

                if (isWinningBet) {
                    baseBetWin = this.calculateBetWin(baseAmount - refundInfo.amount, odd);
                }

                refundInfo.amount = 0;
            }
        } else if (isWinningBet) {
            baseBetWin = this.calculateBetWin(baseAmount, odd);
        }

        const refund = (baseRefund / bet.rate).toFixed(4);
        const betWin = (baseBetWin / bet.rate).toFixed(4);

        bet.baseRefund = baseRefund;
        bet.baseBetWin = baseBetWin;
        bet.refund = refund;
        bet.betwin = betWin;
        await bet.save();

        const baseTotalWin = isWinningBet ? baseBetWin + baseAmount : baseRefund;
        const totalWin = (baseTotalWin / bet.rate).toFixed(4);

        await this.betsRepository.updateOne(
            { uid: bet.uid, roundId },
            {
                $set: { win: isWinningBet, paid: true, time: new Date() },
                $inc: { refund, betwin: betWin, baseRefund, baseBetWin, baseTotalWin, totalWin },
            }
        );
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }
}
