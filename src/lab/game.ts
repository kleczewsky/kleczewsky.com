export const TAU = Math.PI * 2;
export type GameStatus = "ready" | "running" | "miss" | "won";
export type GameState = {
  status: GameStatus;
  angle: number;
  target: number;
  score: number;
  perfect: boolean;
};

export const newGame = (): GameState => ({
  status: "ready",
  angle: -Math.PI / 2,
  target: 0.35,
  score: 0,
  perfect: false,
});
export const targetWidth = (score: number) => Math.max(0.22, 0.64 - score * 0.022);
export const angularDistance = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export function advanceGame(game: GameState, seconds: number) {
  if (game.status === "running")
    game.angle = (game.angle + seconds * Math.min(4.8, 1.45 + game.score * 0.16)) % TAU;
}

export function hitGame(game: GameState, random = Math.random): GameState {
  if (game.status !== "running") return { ...newGame(), status: "running" };
  const distance = angularDistance(game.angle, game.target);
  if (distance > targetWidth(game.score) / 2) return { ...game, status: "miss", perfect: false };
  return {
    ...game,
    score: game.score + 1,
    target: (game.angle + 1.2 + random() * 3.1) % TAU,
    perfect: distance < 0.075,
  };
}
