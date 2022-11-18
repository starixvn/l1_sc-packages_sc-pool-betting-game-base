import { BalancedBot } from "../balanced-bot";

describe("checkRandomBet", () => {
    describe("when smartBotGroupRatio is 0.33", () => {
        it("should return about 30% true", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.gameData = {
                gameConfigs: {
                    smartBotGroupRatio: 0.33,
                },
            };

            // Act
            let trueCount = 0;
            for (let i = 0; i < 1000; i++) {
                const result = balancedBot.checkRandomBet();
                if (result) {
                    trueCount++;
                }
            }

            // Assert
            expect(trueCount).toBeGreaterThan(200);
            expect(trueCount).toBeLessThan(400);
        });
    });
});

describe("getRandomBetAmount", () => {
    describe("when remainingAmount < configMinBet", () => {
        it("should return remainingAmount", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.getMinBet = jest.fn(() => 10);

            // Act
            const result = balancedBot.getRandomBetAmount(9, 100);

            // Assert
            expect(result).toBe(10);
        });
    });

    describe("when remainingAmount >= totalAmount/3", () => {
        it("should return at least totalAmount/3", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.getMinBet = jest.fn(() => 10);
            balancedBot.gameData = {
                gameConfigs: {
                    maxbet: 2000,
                },
            };

            // Act
            const result = balancedBot.getRandomBetAmount(1000, 1000);

            // Assert
            const roundValue = Math.floor(1000 / 30) * 10;
            expect(result).toBeGreaterThanOrEqual(roundValue);
            expect(result).toBeLessThanOrEqual(1000);
        });
    });

    describe("when remainingAmount < totalAmount/3", () => {
        it("should return remainingAmount", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.getMinBet = jest.fn(() => 10);
            balancedBot.gameData = {
                gameConfigs: {
                    maxbet: 2000,
                },
            };

            // Act
            const result = balancedBot.getRandomBetAmount(250, 1000);

            // Assert
            expect(result).toBeLessThanOrEqual(250);
        });
    });

    describe("when remainingAmount > bot maxbet", () => {
        it("should return bot maxbet", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.getMinBet = jest.fn(() => 10);
            balancedBot.gameData = {
                gameConfigs: {
                    maxbet: 200,
                },
            };

            // Act
            const result = balancedBot.getRandomBetAmount(250, 1000);

            // Assert
            expect(result).toBeLessThanOrEqual(200);
        });
    });
});

describe("getExtraAmount", () => {
    it("should return between (0-10)*minBet", () => {
        // Arrange
        const balancedBot = new BalancedBot({});
        balancedBot.getMinBet = jest.fn(() => 10);

        // Act
        const result = balancedBot.getExtraAmount();

        // Assert
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(10 * 10);
    });
});

describe("getRandomBot", () => {
    describe("when having unused bots", () => {
        it("should return first bot from botList", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.botList = [{ id: 1 }, { id: 2 }, { id: 3 }];
            balancedBot.gameData = {
                usedBots: [1],
            };

            // Act
            const result = balancedBot.getRandomBot();

            // Assert
            expect(result.id).toBe(2);
        });

        it("should update remaning botList", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.botList = [{ id: 1 }, { id: 2 }, { id: 3 }];
            balancedBot.gameData = {
                usedBots: [1],
            };

            // Act
            balancedBot.getRandomBot();

            // Assert
            expect(balancedBot.botList.length).toBe(1);
            expect(balancedBot.botList[0].id).toBe(3);
        });
    });

    describe("when not having unused bots", () => {
        it("should return null", () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            balancedBot.botList = [{ id: 1 }, { id: 2 }, { id: 3 }];
            balancedBot.gameData = {
                usedBots: [1, 2, 3],
            };
            balancedBot.logService = {
                logError: jest.fn(),
            };

            // Act
            const result = balancedBot.getRandomBot();

            // Assert
            expect(result).toBe(null);
            expect(balancedBot.logService.logError).toBeCalledWith("no available balanced bot!");
        });
    });
});

describe("run", () => {
    describe("when botList empty", () => {
        it("should do nothing", async () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            const userBet = { betChoice: "big" };
            balancedBot.placeBet = jest.fn();
            balancedBot.appConfigs = {
                balancedBotBettingTime: 10,
            };
            balancedBot.gameData = { totalBets: {} };
            balancedBot.definition = { choices: ["big", "small"] };

            // Act
            await balancedBot.run(userBet);

            // Assert
            expect(balancedBot.placeBet).not.toBeCalled();
        });
    });

    describe("remainingTime > balancedBotBettingTime", () => {
        it("should do nothing", async () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            const userBet = { betChoice: "big" };
            balancedBot.placeBet = jest.fn();
            balancedBot.appConfigs = {
                balancedBotBettingTime: 10,
            };
            balancedBot.gameData = { totalBets: {}, remainingTime: 11 };
            balancedBot.definition = { choices: ["big", "small"], durations: { lockingBet: 5 } };
            balancedBot.botList = [{ id: 12 }];

            // Act
            await balancedBot.run(userBet);

            // Assert
            expect(balancedBot.placeBet).not.toBeCalled();
        });
    });

    describe("total bet on player choice <= opposite total bet", () => {
        it("should do nothing", async () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            const userBet = { betChoice: "big" };
            balancedBot.placeBet = jest.fn();
            balancedBot.appConfigs = {
                balancedBotBettingTime: 10,
            };
            balancedBot.gameData = { totalBets: { big: 100, small: 110 }, remainingTime: 7 };
            balancedBot.definition = { choices: ["big", "small"], durations: { lockingBet: 5 } };
            balancedBot.botList = [{ id: 12 }];

            // Act
            await balancedBot.run(userBet);

            // Assert
            expect(balancedBot.placeBet).not.toBeCalled();
        });
    });

    describe("when conditions are meet", () => {
        it("place balaced bets", async () => {
            // Arrange
            const balancedBot = new BalancedBot({});
            const userBet = { betChoice: "big" };
            balancedBot.placeBet = jest.fn();
            balancedBot.appConfigs = {
                balancedBotBettingTime: 10,
            };
            balancedBot.gameData = { totalBets: { big: 100, small: 90 }, remainingTime: 7 };
            balancedBot.definition = { choices: ["big", "small"], durations: { lockingBet: 5 } };
            balancedBot.botList = [{ id: 12 }];
            balancedBot.checkRandomBet = jest.fn(() => true);
            balancedBot.getExtraAmount = jest.fn(() => 20);

            // Act
            await balancedBot.run(userBet);

            // Assert
            expect(balancedBot.placeBet).toHaveBeenCalledWith("small", 30);
            expect(balancedBot.placeBet).toHaveBeenCalledWith("big", 20);
        });
    });
});

describe("placeBet", () => {
    it("should get bot and update bet", async () => {
        // Arrange
        const balancedBot = new BalancedBot({});
        balancedBot.getRandomBetAmount = jest.fn(() => 300);
        balancedBot.gameData = {
            totalBets: {},
            betCount: {},
        };
        balancedBot.inserBetLog = jest.fn();
        balancedBot.upsertBet = jest.fn();
        balancedBot.getRandomBot = jest.fn(() => {
            return { id: 1 };
        });

        // Act
        await balancedBot.placeBet("big", 1000);

        // Assert
        expect(balancedBot.gameData.totalBets).toEqual({ big: 900 });
        expect(balancedBot.gameData.betCount).toEqual({ big: 3 });
    });
});
