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
    use: jest.fn(),
};

describe("SocketRouter test", () => {
    beforeEach(() => {
        spyOn(logService, "logError");
    });

    it("_extends BaseSocketRouter", () => {
        expect(socketRouter instanceof Core.Routers.BaseSocketRouter).toBeTruthy();
    });

    it("init_always_registers events", () => {
        // arrange
        spyOn(Core.Routers.BaseSocketRouter.prototype, "init");

        // act
        socketRouter.init(socketClient);

        // assert
        expect(Core.Routers.BaseSocketRouter.prototype.init).toHaveBeenCalled();
        expect(socketClient.on).toHaveBeenCalled();
    });

    describe("handleGetRound", () => {
        beforeEach(() => {
            socketRouter.init(socketClient);
        });
        describe("invalid payload", () => {
            it("_verify failed", () => {
                spyOn(socketRouter, "verify").and.returnValue(false);
                // act
                socketRouter.handleGetRound({ roundId: 1 });

                // asset
                expect(socketClient.emit).not.toHaveBeenCalled();
            });

            it("_invalid roundId", () => {
                spyOn(socketRouter, "verify").and.returnValue(true);
                // act
                socketRouter.handleGetRound({ roundId: 0 });

                // asset
                expect(socketClient.emit).not.toHaveBeenCalled();
            });

            it("_roundId greater than or equal gameData.roundId", () => {
                spyOn(socketRouter, "verify").and.returnValue(true);

                // act
                socketRouter.handleGetRound({ roundId: 101 });

                // asset
                expect(socketClient.emit).not.toHaveBeenCalled();
            });
        });

        it("valid payload_", () => {
            spyOn(socketRouter, "verify").and.returnValue(true);
            spyOn(roundQuery, "getRound");

            // act
            socketRouter.handleGetRound({ roundId: 99 });

            // asset
            expect(roundQuery.getRound).toHaveBeenCalled();
        });

        it("have error_log error", () => {
            spyOn(socketRouter, "verify").and.returnValue(true);
            spyOn(roundQuery, "getRound").and.throwError("error");

            // act
            socketRouter.handleGetRound({ roundId: 99 });

            // asset
            expect(logger.logError).toHaveBeenCalled();
        });
    });
});
