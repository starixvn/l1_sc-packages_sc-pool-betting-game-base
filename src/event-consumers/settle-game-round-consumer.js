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
        const betAmount = bet.amount;
        const totalLost = betAmount - bet.tralai;

        return {
            totalBetAmount: betAmount,
            totalWin: betItem.win ? betItem.betWin + betAmount : totalLost,
            totalLost: totalLost,
        };
    }

    queryBets(roundId) {
        return this.gameDefinition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: 1 } }).exec();
    }

    querySettledBets(roundId) {
        return this.gameDefinition.betRepository.find({ phien: roundId, thanhtoan: true }).exec();
    }

    settleBetsByGroup(tickets, roundId, settlementResult, totalBets) {
        const payoutData = {
            amount: Math.min(...Object.values(totalBets)),
        };

        return tickets.map((ticket) => {
            this.memberPayout(ticket, roundId, settlementResult, payoutData);
        });
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

        await ticket.save();
        await this.gameDefinition.betRepository
            .updateOne(
                { uid: obj.uid, phien: roundId },
                { $set: { win: isWinTicket, thanhtoan: true, time: new Date() }, $inc: { tralai: refund, betwin: betWin } }
            )
            .exec();
    }

    calculateBetWin(betAmount, odd) {
        return betAmount * (odd - 1);
    }
}
