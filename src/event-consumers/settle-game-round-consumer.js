import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    constructor({ gameDefinition, gameData, roundResultPublisher, userBetResultPublisher }) {
        super(gameDefinition, gameData, roundResultPublisher, userBetResultPublisher);
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const tickets = this.queryBets(roundId);

        if (tickets && tickets.length) {
            const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
            const uusUserIds = uusUsers.map((user) => user.id);

            const realTickets = tickets.filter((bet) => !uusUserIds.includes(bet.uid));
            const uusTickets = tickets.filter((bet) => uusUserIds.includes(bet.uid));

            await Promise.all([
                this.settleBetsByGroup(realTickets, roundId, settlementResult, this.gameData.totalBets),
                this.settleBetsByGroup(uusTickets, roundId, settlementResult, this.gameData.totalUUSBets),
            ]);

            const settledBets = await this.querySettledBets(roundId);

            await Promise.all(
                settledBets.map(async (bet) => {
                    const betResult = this.calculateBetResult(settlementResult, bet);
                    await this.callEndGame(bet, roundId, time, betResult);
                    this.calculateBetResult(bet.uid, betResult);
                    this.userBetResultPublisher.publish(bet.uid, betResult);
                })
            );
        }

        this.roundResultPublisher.publishRoundResult(this.collectRoundResult(result, settlementResult, roundId));
    }

    calculateBetResult(settlementResult, bet) {
        const betAmount = this.calculateBetAmount(bet, settlementResult);
        const totalLost = betAmount - bet.tralai;

        return {
            totalBetAmount: betAmount,
            totalWin: betItem.win ? betItem.betWin + betAmount : totalLost,
            totalLost: totalLost,
        };
    }

    async queryBets(roundId) {
        return await this.gameDefinition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: 1 } }).exec();
    }

    async querySettledBets(roundId) {
        return await this.gameDefinition.betRepository.find({ phien: roundId, thanhtoan: true }).exec();
    }

    settleBetsByGroup(tickets, roundId, settlementResult, totalBets) {
        const payoutData = {
            amount: Math.min(...Object.values(totalBets)),
        };

        return tickets.map(async (ticket) => {
            return await this.memberPayout(ticket, roundId, settlementResult, payoutData);
        });
    }

    async memberPayout(ticket, roundId, settlementResult, payoutData) {
        let betWin = 0;
        let refund = 0;
        const winningChoice = this.getWinningChoice(settlementResult);
        const isWinTicket = this.isWinTicket(ticket, winningChoice);

        ticket.thanhtoan = true;
        ticket.win = isWinTicket;

        if (payoutData.amount && isWinTicket) {
            const winningBetAmount = ticket[winningChoice];
            const odd = this.gameData.gameConfigs.odds[winningChoice];
            if (payoutData.amount >= winningBetAmount) {
                betWin = this.calculateBetWin(winningBetAmount, odd);
                payoutData.amount -= winningBetAmount;
            } else {
                betWin = this.calculateBetWin(payoutData.amount, odd);
                refund = winningBetAmount - payoutData.amount;
                payoutData.amount = 0;
            }
            ticket.betwin = betWin;
        } else {
            refund = this.calculateBetAmount(ticket, settlementResult);
        }

        await ticket.save();
        return await this.gameDefinition.betRepository
            .updateOne(
                { uid: obj.uid, phien: roundId },
                { $set: { win: isWinTicket, thanhtoan: true, time: new Date() }, $inc: { tralai: refund, betwin: betWin } }
            )
            .exec();
    }

    calculateBetAmount(ticket, settlementResult) {
        return Object.keys(settlementResult).reduce((total, choice) => total + (ticket[choice] || 0), 0);
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }

    getWinningChoice(settlementResult) {
        return Object.keys(settlementResult).find((choice) => settlementResult[choice]);
    }

    isWinTicket(ticket, winningChoice) {
        return ticket[winningChoice];
    }
}
