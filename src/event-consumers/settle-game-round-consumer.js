import { userInfos } from "sc-base-database";
import { Core } from "sc-game-base";

export default class SettleGameRoundConsumer extends Core.BaseEventConsumers.SettleGameRoundConsumer {
    async queryBets(roundId) {
        return await this.gameDefinition.betLogRepository.find({ phien: roundId }, null, { sort: { _id: 1 } }).exec();
    }

    async settleBets({ result, settlementResult, roundId, time }) {
        const tickets = this.queryBets(roundId);

        if (tickets && tickets.length) {
            const uusUsers = await userInfos.find({ currency: "UUS" }, "id").exec();
            const uusUserIds = uusUsers.map((user) => user.id);

            const normalTickets = tickets.filter((bet) => !uusUserIds.includes(bet.uid));
            const uusTickets = tickets.filter((bet) => uusUserIds.includes(bet.uid));

            await Promise.all([
                this.settleBetsByGroup(normalTickets, roundId, settlementResult),
                this.settleBetsByGroup(uusTickets, roundId, settlementResult),
            ]);
        }
    }

    settleBetsByGroup(tickets, roundId, settlementResult) {
        const payoutData = {
            amount: this.calculatePayoutAmount(tickets),
        };

        return tickets.map(async (ticket) => {
            return await this.memberPayout(ticket, roundId, settlementResult, payoutData);
        });
    }

    calculatePayoutAmount(tickets) {
        let totalFavouriteBetAmount = 0;
        let totalUnderdogBetAmount = 0;

        tickets.foreach((ticket) => {
            if (this.isFavouriteTicket(ticket)) {
                totalFavouriteBetAmount += ticket.bet;
            } else {
                totalUnderdogBetAmount += ticket.bet;
            }
        });

        return totalFavouriteBetAmount > totalUnderdogBetAmount ? totalUnderdogBetAmount : totalFavouriteBetAmount;
    }

    async memberPayout(ticket, roundId, settlementResult, payoutData) {
        let betWin = 0;
        let refund = 0;
        const isWinTicket = this.isWinTicket(ticket, settlementResult);

        ticket.thanhtoan = true;
        ticket.win = isWinTicket;

        if (payoutData.amount && isWinTicket) {
            if (payoutData.amount >= ticket.bet) {
                betWin = this.calculateBetWin(ticket.bet);
                payoutData.amount -= ticket.bet;
            } else {
                betWin = this.calculateBetWin(payoutData.amount);
                refund = ticket.bet - payoutData.amount;
                payoutData.amount = 0;
            }
            ticket.betwin = betWin;
        } else {
            refund = ticket.bet;
        }

        await ticket.save();
        return await this.gameDefinition.betRepository
            .updateOne(
                { uid: obj.uid, phien: roundId },
                { $set: { win: isWinTicket, thanhtoan: true, time: new Date() }, $inc: { tralai: refund, betwin: betWin } }
            )
            .exec();
    }

    calculateBetWin(betAmount) {
        return betAmount - (betAmount * this.gameData.commission) / 100;
    }

    isFavouriteTicket(ticket) {
        return ticket.select;
    }

    isWinTicket(ticket, settlementResult) {
        return (
            (this.isFavouriteTicket(ticket) && settlementResult["favourite"]) ||
            (!this.isFavouriteTicket(ticket) && settlementResult["underdog"])
        );
    }
}
