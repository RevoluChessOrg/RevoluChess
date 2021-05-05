import React from "react";

// import AudioReactRecorder, { RecordState } from "audio-react-recorder";
// eslint-disable-next-line
import axios from "axios";

import ASR from "./asr";

import "../index.css";
import Board from "./board.js";
import King from "../pieces/king";
// eslint-disable-next-line
import Pawn from "../pieces/pawn";
// eslint-disable-next-line
import Queen from "../pieces/queen";
// eslint-disable-next-line
import Knight from "../pieces/knight";
// eslint-disable-next-line
import Rook from "../pieces/rook";
// eslint-disable-next-line
import Bishop from "../pieces/bishop";

import FallenSoldierBlock from "./fallen-soldier-block.js";
import initialiseChessBoard from "../helpers/board-initialiser.js";
import { tryPromote } from "../helpers/utils";

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
            isBlackCastled: false,
        };

        // this.handleAudioResponse = this.handleAudioResponse.bind(this);
        // this.isStartWrongSquare = this.isStartWrongSquare.bind(this);
        // this.isMovingToSamePlayer = this.isMovingToSamePlayer.bind(this);
        this.handleTrans = this.handleTrans.bind(this);
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
        return player === 1 ? this.state.isWhiteCastled : this.state.isBlackCastled;
    }

    castled(player) {
        if (player === 1) this.setState({ isWhiteCastled: true });
        else this.setState({ isBlackCastled: true });
    }

    async handleClick(i, delay=0) {
        if(delay){
            await new Promise((r) => setTimeout(r, delay));
        }
        console.log(`handle click: i`, i);
        const squares = [...this.state.squares];
        const square = squares[i];

        if (this.state.sourceSelection === -1) {
            if (this.isStartWrongSquare(square)) return;
            square.style = { ...square.style, backgroundColor: "RGB(111,143,114)" };
            this.setState(
                {
                    status: "Choose destination for the selected piece",
                    sourceSelection: i,
                }
            );
            return "success";
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

        if (
            squares[i] instanceof King &&
            squares[i].isCastling(sourceSelection, i) &&
            !this.isCastled(this.state.player)
        ) {
            const isCastlingRight = i > sourceSelection;
            const rookPos = isCastlingRight ? i + 1 : i - 2;
            const rookDes = isCastlingRight ? sourceSelection + 1 : sourceSelection - 1;
            squares[rookDes] = squares[rookPos];
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

        return "success";
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

    // 'เรือ เอ สาม ไป บี หนึ่ง' => this.handleClick(3) ,  this.handleClick(9)
    //
    async handleTrans(words) {
        console.log(`words`, words);
        const { squares, player } = this.state;
        const isWhite = player === 1;
        const isKing = (square) => square instanceof King;
        let st = 0;
        // king.player <== get player
        // const res = this.handleClick(3); undefined, 'success'
        const alp = ["เอ", "บี", "ซี", "ดี", "อี", "เอฟ", "จี", "เอช"];
        const num = ["หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด"];
        const pieces = ["ธุลี", "ก้อย", "เณร", "เรือดำน้ำ", "ฟูฟู", "ราชา"];
        const piecesMap = { "ธุลี": Pawn, "ก้อย": Queen, "เณร": Bishop, "เรือดำน้ำ": Rook, "ฟูฟู": Knight, "ราชา": King };
        const wordlist = words.split(" ");
        let x = -1,
            y = -1,
            res;
        let first = [];
        for (let i = 0; i < wordlist.length; i++) {
            // console.log(st)
            if (st === 0) {
                if (alp.includes(wordlist[i])) {
                    y = alp.indexOf(wordlist[i]);
                    st = 1;
                } else if (pieces.includes(wordlist[i])) {
                    for (let j = 0; j < 64; j++) {
                        if (squares[j] instanceof piecesMap[wordlist[i]] && squares[j].player === player) {
                            first.push(j);
                        }
                    }
                    if (first.length === 0) return false;
                    st = 2;
                }
            } else if (st == 1) {
                if (num.includes(wordlist[i])) {
                    x = 7 - num.indexOf(wordlist[i]);
                    first.push(x * 8 + y);
                    st = 4;
                } else st = 0;
            } else if (st == 2) {
                if (alp.includes(wordlist[i])) {
                    y = alp.indexOf(wordlist[i]);
                    st = 3;
                } else st = 4;
            } else if (st == 3) {
                if (num.includes(wordlist[i])) {
                    x = 7 - num.indexOf(wordlist[i]);
                    let ch = 0;
                    for (let j = 0; j < first.length; j++) {
                        if (first[j] === x * 8 + y) {
                            ch = 1;
                            break;
                        }
                    }
                    if (ch === 0) return false;
                    first = [];
                    first.push(x * 8 + y);
                }
                st = 4;
            } else if (st == 4) {
                if (alp.includes(wordlist[i])) {
                    y = alp.indexOf(wordlist[i]);
                    st = 5;
                }
            } else if (st == 5) {
                if (num.includes(wordlist[i])) {
                    x = 7 - num.indexOf(wordlist[i]);
                    for (let k = 0; k < first.length; k++) {
                        res = await this.handleClick(first[k], 500);
                        if (res === "success") {
                            res = await this.handleClick(x * 8 + y, 500);
                            if (res === "success") return true;
                        }
                    }
                } else return false;
            }
        }
        return false;
    }

    async handleAudioResponse(audio) {
        // eslint-disable-next-line
        const { blob, type, url } = audio;
        console.log("audio :>> ", audio);

        axios
            .post("http://13.67.109.16:5050", blob)
            // .post('http://localhost:8080', blob)
            .then((res) => console.log(`res`, res))
            .catch((e) => console.log(`e`, e));
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

                {/* <div>
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
                </div> */}
                <div style={{ marginTop: 5 }}>
                    <ASR handleTrans={this.handleTrans} />
                    {/* <AudioReactRecorder state={this.state.recordState} onStop={this.handleAudioResponse} /> */}
                </div>
            </div>
        );
    }
}
