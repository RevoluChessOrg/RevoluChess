import React from "react";

import AudioReactRecorder, { RecordState } from "audio-react-recorder";
// eslint-disable-next-line
import axios from "axios";

import "../index.css";
import Board from "./board.js";
import King from "../pieces/king";
// eslint-disable-next-line
import Pawn from "../pieces/pawn";
import FallenSoldierBlock from "./fallen-soldier-block.js";
import initialiseChessBoard from "../helpers/board-initialiser.js";
import {tryPromote} from "../helpers/utils";

export default class Game extends React.Component {
    constructor() {
        super();
        this.state = {
            squares: initialiseChessBoard(),
            whiteFallenSoldiers: [],
            blackFallenSoldiers: [],
            player: 1,
            sourceSelection: -1,
            status: "",
            turn: "white",
            // ==== CUSTOM ====
            recordState: null,
            lastOpponentMove: null,
            isWhiteCastled: false,
            isBlackCastled: false
        };

        // this.handleAudioResponse = this.handleAudioResponse.bind(this);
        // this.isStartWrongSquare = this.isStartWrongSquare.bind(this);
        // this.isMovingToSamePlayer = this.isMovingToSamePlayer.bind(this);
    }

    isStartWrongSquare(square) {
        const isWrong = !square || square.player !== this.state.player;

        if (isWrong) {
            this.setState({ status: "Wrong selection. Choose player " + this.state.player + " pieces." });
        } else if (square) {
            square.style = { ...square.style, backgroundColor: "" };
        }

        return isWrong;
    }

    isMovingToSamePlayer(square) {
        const isWrong = square && square.player === this.state.player;
        if (isWrong) {
            this.setState({
                status: "Wrong selection. Choose valid source and destination again.",
                sourceSelection: -1,
            });
        }
        return isWrong;
    }

    isCastled(player) {
        return player === 1 ? this.isWhiteCastled : this.isBlackCastled;
    }

    castled(player) {
        if(player === 1) this.setState({isWhiteCastled: true});
        else this.setState({isBlackCastled: true});
    }

    handleClick(i) {
        const squares = [...this.state.squares];
        const square = squares[i];

        if (this.state.sourceSelection === -1) {
            if (this.isStartWrongSquare(square)) return;
            square.style = { ...square.style, backgroundColor: "RGB(111,143,114)" };
            this.setState({
                status: "Choose destination for the selected piece",
                sourceSelection: i,
            });
            return 'success';
        }

        squares[this.state.sourceSelection].style = {
            ...squares[this.state.sourceSelection].style,
            backgroundColor: "",
        };

        if (this.isMovingToSamePlayer(square)) return;

        const whiteFallenSoldiers = [];
        const blackFallenSoldiers = [];
        const isDestEnemyOccupied = Boolean(squares[i]);
        const isMovePossible = squares[this.state.sourceSelection].isMovePossible(
            this.state.sourceSelection,
            i,
            isDestEnemyOccupied
        );

        if (!isMovePossible) {
            this.setState({
                status: "Wrong selection. Choose valid source and destination again.",
                sourceSelection: -1,
            });
            return;
        }

        if (squares[i] !== null) {
            if (squares[i].player === 1) {
                whiteFallenSoldiers.push(squares[i]);
            } else {
                blackFallenSoldiers.push(squares[i]);
            }
        }

        const lastSelectedSquare = squares[this.state.sourceSelection];
        const mightPromoteSquare = tryPromote(lastSelectedSquare, i);

        const { sourceSelection } = this.state;

        squares[i] = mightPromoteSquare; //squares[this.state.sourceSelection];
        squares[sourceSelection] = null;

        if(squares[i] instanceof King && squares[i].isCastling(sourceSelection, i) && !this.isCastled(this.state.player)) {
            const isCastlingRight = i > sourceSelection;
            const rookPos = isCastlingRight ? i + 1 : i - 2;
            const rookDes = isCastlingRight ? sourceSelection + 1 : sourceSelection - 1;
            squares[rookDes] = squares[rookPos]
            squares[rookPos] = null;
            this.castled(this.state.player);
        }

        const isCheckMe = this.isCheckForPlayer(squares, this.state.player);

        if (isCheckMe) {
            this.setState((_oldState) => ({
                status: "Wrong selection. Choose valid source and destination again. Now you have a check!",
                sourceSelection: -1,
            }));
            return;
        }

        const player = this.state.player === 1 ? 2 : 1;
        const turn = this.state.turn === "white" ? "black" : "white";

        this.setState((oldState) => ({
            sourceSelection: -1,
            squares,
            whiteFallenSoldiers: [...oldState.whiteFallenSoldiers, ...whiteFallenSoldiers],
            blackFallenSoldiers: [...oldState.blackFallenSoldiers, ...blackFallenSoldiers],
            player,
            status: "",
            turn,
        }));

        return 'success';
    }

    getKingPosition(squares, player) {
        return squares.reduce(
            (acc, curr, i) =>
                acc || //King may be only one, if we had found it, returned his position
                (curr && //current squre mustn't be a null
                    curr.getPlayer() === player && //we are looking for aspecial king
                    curr instanceof King &&
                    i), // returned position if all conditions are completed
            null
        );
    }

    isCheckForPlayer(squares, player) {
        const opponent = player === 1 ? 2 : 1;
        const playersKingPosition = this.getKingPosition(squares, player);
        const canPieceKillPlayersKing = (piece, i) => piece.isMovePossible(playersKingPosition, i, squares);
        return squares.reduce(
            (acc, curr, idx) =>
                acc || (curr && curr.getPlayer() === opponent && canPieceKillPlayersKing(curr, idx) && true),
            false
        );
    }

    async handleAudioResponse(audio) {
        // eslint-disable-next-line
        const { blob, type, url } = audio;
        console.log("audio :>> ", audio);

    }

    render() {
        return (
            <div>
                <div className="game">
                    <div className="game-board">
                        <Board squares={this.state.squares} onClick={(i) => this.handleClick(i)} />
                    </div>
                    <div className="game-info">
                        <h3>Turn</h3>
                        <div id="player-turn-box" style={{ backgroundColor: this.state.turn }}></div>
                        <div className="game-status">{this.state.status}</div>

                        <div className="fallen-soldier-block">
                            {
                                <FallenSoldierBlock
                                    whiteFallenSoldiers={this.state.whiteFallenSoldiers}
                                    blackFallenSoldiers={this.state.blackFallenSoldiers}
                                />
                            }
                        </div>
                    </div>
                </div>

                {/* <div className="icons-attribution">
                    <div>
                        {" "}
                        <small>
                            {" "}
                            Chess Icons And Favicon (extracted) By en:User:Cburnett [
                            <a href="http://www.gnu.org/copyleft/fdl.html">GFDL</a>,{" "}
                            <a href="http://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA-3.0</a>,{" "}
                            <a href="http://opensource.org/licenses/bsd-license.php">BSD</a> or{" "}
                            <a href="http://www.gnu.org/licenses/gpl.html">GPL</a>],{" "}
                            <a href="https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces">
                                via Wikimedia Commons
                            </a>{" "}
                        </small>
                    </div>
                </div> */}
                {/* <ul>
                    <li>
                        <a href="https://github.com/TalhaAwan/react-chess" target="_blank">
                            Source Code
                        </a>{" "}
                    </li>
                    <li>
                        <a href="https://www.techighness.com/post/develop-two-player-chess-game-with-react-js/">
                            Blog Post
                        </a>
                    </li>
                </ul> */}

                <div>
                    <button
                        style={{ fontSize: 30, background: `rgb(0, 255, 0, .2)` }}
                        onClick={() => this.setState({ recordState: RecordState.START })}
                    >
                        Start
                    </button>
                    <button
                        style={{ fontSize: 30, background: `rgb(255, 0, 0, .2)`, marginLeft: 5 }}
                        onClick={() => this.setState({ recordState: RecordState.STOP })}
                    >
                        Stop
                    </button>
                </div>
                <div style={{ marginTop: 5 }}>
                    <AudioReactRecorder state={this.state.recordState} onStop={this.handleAudioResponse} />
                </div>
            </div>
        );
    }
}
