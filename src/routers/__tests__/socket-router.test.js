import { stub } from "jest-micro-auto-stub";
import { logger } from "sc-common";
import { Core } from "sc-game-base";

import { GameData } from "../../game-data";
import { RoundQuery } from "../../query-apis/round-query";
import { SocketRouter } from "../socket-router";

const userSignInConsumer = stub(Core.BaseEventConsumers.UserSignInConsumer);
const inGameConsumer = stub(Core.BaseEventConsumers.InGameConsumer);
const placeBetConsumer = stub(Core.BaseEventConsumers.PlaceBetConsumer);
const userDisconnectConsumer = stub(Core.BaseEventConsumers.UserDisconnectConsumer);
const userSignInPublisher = stub(Core.BaseEventConsumers.UserSignInPublisher);
const historyQuery = stub(Core.QueryApis.HistoryQuery);
const logService = stub(logger);
const roundQuery = stub(RoundQuery);

const definition = { name: "name" };
const gameData = new GameData(0);
gameData.roundId = 100;
gameData.realPlayers = {
    "socket-id": {},
};
const socketRouter = new SocketRouter({
    definition,
    gameData,
    userSignInConsumer,
    inGameConsumer,
    placeBetConsumer,
    userDisconnectConsumer,
    userSignInPublisher,
    historyQuery,
    logService,
    roundQuery,
});

const socketClient = {
    id: "socket-id",
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
};

const round = {
    roundId: 99,
};

describe("SocketRouter", () => {
    beforeEach(() => {
        // Arrange
        spyOn(logService, "logError");
    });

    it("should inherit BaseSocketRouter", () => {
        // Assert
        expect(socketRouter instanceof Core.Routers.BaseSocketRouter).toBeTruthy();
    });

    describe("init", () => {
        beforeAll(() => {
            // Arrange
            spyOn(Core.Routers.BaseSocketRouter.prototype, "init");

            // Act
            socketRouter.init(socketClient);
        });

        it("should call super.init", () => {
            // Assert
            expect(Core.Routers.BaseSocketRouter.prototype.init).toHaveBeenCalled();
        });

        it("should register event for socketClient", () => {
            expect(socketClient.on).toHaveBeenCalled();
        });
    });

    describe("handleGetRound", () => {
        beforeAll(() => {
            // Arrange
            socketRouter.init(socketClient);
        });

        describe("when verify failed", () => {
            beforeAll(() => {
                // Arrange
                spyOn(socketRouter, "verify").and.returnValue(false);

                // Act
                socketRouter.handleGetRound({ roundId: 1 });
            });

            it("should NOT call getRound", () => {
                // Assert
                expect(roundQuery.getRound).not.toHaveBeenCalled();
            });

            it("should NOT emit message to socket client", () => {
                // Assert
                expect(socketClient.emit).not.toHaveBeenCalled();
            });
        });

        describe("when roundId in payload is invalid", () => {
            beforeAll(() => {
                // Arrange
                spyOn(socketRouter, "verify").and.returnValue(true);

                // Act
                socketRouter.handleGetRound({ roundId: 0 });
            });

            it("should not call getRound", () => {
                // Assert
                expect(roundQuery.getRound).not.toHaveBeenCalled();
            });

            it("should NOT emit message to socket client", () => {
                // Assert
                expect(socketClient.emit).not.toHaveBeenCalled();
            });
        });

        describe("when verify passed and roundId is valid", () => {
            beforeAll(() => {
                // Arrange
                spyOn(socketRouter, "verify").and.returnValue(true);
            });

            describe("when DON'T have exception", () => {
                beforeAll(async () => {
                    // Arrange
                    spyOn(roundQuery, "getRound").and.returnValue(round);

                    // Act
                    await socketRouter.handleGetRound({ roundId: 99 });
                });

                it("should call getRound", () => {
                    // Assert
                    expect(roundQuery.getRound).toHaveBeenCalled();
                });

                it("should emit round info to client", () => {
                    // Arrange
                    expect(socketClient.emit).toHaveBeenCalledWith(definition.name, { round });
                });
            });

            describe("when have exception", () => {
                beforeEach(async () => {
                    spyOn(roundQuery, "getRound").and.throwError("error");

                    // Act
                    await socketRouter.handleGetRound({ roundId: 99 });
                });

                it("should call logError", () => {
                    // Assert
                    expect(logger.logError).toHaveBeenCalled();
                });
            });
        });
    });
});
