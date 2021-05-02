import Queen from "../pieces/queen";
import Pawn from "../pieces/pawn";

function tryPromote(sourceSquare, i) {
    console.log(`sourceSquare`, sourceSquare);
    console.log(`i`, i);
    console.log("===========");
    if (!sourceSquare) return sourceSquare;
    if (!(sourceSquare instanceof Pawn)) return sourceSquare;

    const { player, style } = sourceSquare;
    const newQueen = new Queen(player);

    if (player == 1 && 0 <= i && i <= 7) return newQueen;
    if (player == 2 && 56 <= i && i <= 63) return newQueen;

    return sourceSquare;
}

export { tryPromote };
