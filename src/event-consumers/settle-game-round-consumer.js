import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    constructor({ definition, gameData, roundResultPublisher, userBetResultPublisher }) {
        super(definition, gameData, roundResultPublisher, userBetResultPublisher);
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const tickets = await this.queryBets(roundId);

        if (tickets && tickets.length) {
            const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
            const uusUserIds = uusUsers.map((user) => user.id);

            const realTickets = tickets.filter((bet) => !uusUserIds.includes(bet.uid));
            const realTicketProcessors = this.settleBetsByGroup(realTickets, roundId, settlementResult, this.gameData.totalBets);
            const uusTickets = tickets.filter((bet) => uusUserIds.includes(bet.uid));
            const uusTicketProcessors = this.settleBetsByGroup(uusTickets, roundId, settlementResult, this.gameData.totalUUSBets);

            await Promise.all(realTicketProcessors.concat(uusTicketProcessors));

            const settledBets = await this.querySettledBets(roundId);

            await Promise.all(
                settledBets.map(async (bet) => {
                    const betResult = this.calculateBetResult(bet);
                    await this.callEndGame(bet, roundId, time, betResult);
                    this.captureBetResult(bet.uid, betResult);
                    this.userBetResultPublisher.publish(bet.uid, betResult);
                })
            );
        }

        this.roundResultPublisher.publishRoundResult(this.collectRoundResult(result, settlementResult, roundId));
    }

    calculateBetResult(bet) {
        const totalLost = bet.amount - bet.tralai;
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

    settleBetsByGroup(tickets, roundId, settlementResult, totalBets) {
        const payoutData = {
            amount: Math.min(...Object.values(totalBets)),
        };

        return tickets.map((ticket) => this.memberPayout(ticket, roundId, settlementResult, payoutData));
    }

    async memberPayout(ticket, roundId, settlementResult, payoutData) {
        let betWin = 0;
        let refund = 0;
        const { choice, amount: betAmount } = ticket;
        const isWinTicket = settlementResult[choice];

        ticket.thanhtoan = true;
        ticket.win = isWinTicket;

        if (payoutData.amount && isWinTicket) {
            const odd = this.gameData.gameConfigs.odds[choice];
            if (payoutData.amount >= betAmount) {
                betWin = this.calculateBetWin(betAmount, odd);
                payoutData.amount -= betAmount;
            } else {
                betWin = this.calculateBetWin(payoutData.amount, odd);
                refund = betAmount - payoutData.amount;
                payoutData.amount = 0;
            }
            ticket.betwin = betWin;
        } else {
            refund = betAmount;
        }

        ticket.tralai = refund;
        await ticket.save();
        await this.definition.betRepository
            .updateOne(
                { uid: ticket.uid, phien: roundId },
                { $set: { win: isWinTicket, thanhtoan: true, time: new Date() }, $inc: { tralai: refund, betwin: betWin } }
            )
            .exec();
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }
}
