import { Core } from "sc-game-base";

export default class RunningRoundInfoPublisher extends Core.BaseEventPublishers.RunningRoundInfoPublisher {
    publish(gameData) {
        super.publish(gameData);

        this.publishToAllAdmins({ totalBets: gameData.totalBets })

        const { betCount } = gameData;
        const choices = Object.keys(betCount);

        if (choices.length) {
            const betPercentage = {};
            const totalBetCount = Object.values(betCount).reduce((accumulator, currentValue) => accumulator + currentValue);
            const percent = parseInt((betCount[choices[0]] * 100) / totalBetCount);

            betPercentage[choices[0]] = percent;

            if (choices[1]) {
                betPercentage[choices[1]] = 100 - percent;
            }

            this.publishToAllUsers({ betPercentage });
        }
    }
}
