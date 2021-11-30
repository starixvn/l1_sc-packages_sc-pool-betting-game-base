import { Core } from "sc-game-base";

export class RunningRoundInfoPublisher extends Core.BaseEventPublishers.RunningRoundInfoPublisher {
    publish() {
        super.publish();

        this.publishBetPercentage();
    }

    publishBetPercentage() {
        const { betCount } = this.gameData;
        const choices = Object.keys(betCount);

        if (choices.length) {
            const betPercentage = this.calculateBetPercentage(choices);
            this.publishToAllUsers({ betPercentage });
        }
    }

    calculateBetPercentage(choices) {
        const betPercentage = {};
        const { betCount } = this.gameData;
        const totalBetCount = Object.values(betCount).reduce((accumulator, currentValue) => accumulator + currentValue);
        const percent = parseInt((betCount[choices[0]] * 100) / totalBetCount);

        betPercentage[choices[0]] = percent;

        if (choices[1]) {
            betPercentage[choices[1]] = 100 - percent;
        }

        return betPercentage;
    }
}
