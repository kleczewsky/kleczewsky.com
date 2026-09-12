import type { Toy } from "./toys";
import { pickLetter, stampLetters, stepFoundry, type Foundry } from "./foundry-physics";

export function foundryToy(ctx: CanvasRenderingContext2D): Toy {
  const world: Foundry = { letters: [], width: 1, height: 1, serial: 0 };
  let grabbed = -1,
    wasHeld = false,
    word = "PLAY",
    hasSize = false;
  const stamp = () => {
    ctx.font = '600 100px "Teko", sans-serif';
    stampLetters(world, word, (glyph) => ctx.measureText(glyph).width / 100);
  };
  const colors = ["#f6334c", "#eeece5", "#f6334c", "#818685"];
  return {
    resize(width, height) {
      if (hasSize) {
        const scale = Math.min(width / world.width, height / world.height);
        for (const body of world.letters) {
          body.x *= width / world.width;
          body.y *= height / world.height;
          body.hw *= scale;
          body.hh *= scale;
        }
      }
      world.width = width;
      world.height = height;
      if (!hasSize) {
        hasSize = true;
        stamp();
      }
    },
    draw(dt, x, y, parameter, _active, held) {
      const px = x * world.width,
        py = y * world.height;
      if (held && !wasHeld) grabbed = pickLetter(world, px, py);
      if (!held) grabbed = -1;
      wasHeld = held;
      stepFoundry(
        world,
        dt,
        140 + parameter * 1100,
        grabbed >= 0 ? { index: grabbed, x: px, y: py } : undefined,
      );
      const floor = world.height - 55;
      ctx.strokeStyle = "#60353c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, floor + 3);
      ctx.lineTo(world.width - 14, floor + 3);
      ctx.stroke();
      ctx.fillStyle = "#5c454b";
      for (let tick = 20; tick < world.width - 15; tick += 14) ctx.fillRect(tick, floor + 8, 4, 1);
      for (const body of world.letters) {
        ctx.save();
        ctx.translate(body.x, body.y);
        ctx.rotate(body.angle);
        ctx.font = `600 ${(body.hh * 2) / 0.66}px "Teko", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        const metrics = ctx.measureText(body.glyph);
        const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const glyphWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        ctx.scale(
          (body.hw * 2) / Math.max(1, glyphWidth),
          (body.hh * 2) / Math.max(1, glyphHeight),
        );
        const baseline = (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
        ctx.fillStyle = "#330d17";
        ctx.fillText(body.glyph, 3, baseline + 4);
        ctx.fillStyle = colors[body.color]!;
        ctx.fillText(body.glyph, 0, baseline);
        ctx.restore();
      }
      if (grabbed >= 0) {
        ctx.strokeStyle = "#ff839877";
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    text(value) {
      word = value;
      stamp();
    },
    action() {
      for (const body of world.letters) {
        body.vx += (body.x / world.width - 0.5) * 700;
        body.vy = -360 - Math.random() * 220;
        body.spin += (Math.random() - 0.5) * 7;
      }
    },
    reset() {
      world.letters = [];
      world.serial = 0;
      word = "PLAY";
      grabbed = -1;
      wasHeld = false;
      stamp();
    },
  };
}
