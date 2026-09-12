import type { Toy } from "./toys";

const COUNT = 8;
const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }`;
const fragment = `precision highp float;
uniform vec2 resolution;
uniform vec3 drops[8];
float field(vec3 p) {
  float f = 0.;
  for (int i = 0; i < 8; i++) {
    vec3 d = p - vec3(drops[i].xy, 0.);
    float inv = inversesqrt(dot(d, d) + .0001);
    f += pow(drops[i].z, 3.) * inv * inv * inv;
  }
  return f;
}
void main() {
  vec2 uv = (gl_FragCoord.xy * 2. - resolution) / resolution.y;
  float edge = field(vec3(uv, 0.));
  if (edge < .985) { gl_FragColor = vec4(0.); return; }
  float lo = 0., hi = 1.6;
  for (int i = 0; i < 9; i++) {
    float z = (lo + hi) * .5;
    if (field(vec3(uv, z)) > 1.) lo = z; else hi = z;
  }
  vec3 p = vec3(uv, (lo + hi) * .5), normal = vec3(0.);
  for (int i = 0; i < 8; i++) {
    vec3 d = p - vec3(drops[i].xy, 0.);
    float inv = inversesqrt(dot(d, d) + .0001);
    normal += d * pow(drops[i].z, 3.) * pow(inv, 5.);
  }
  vec3 n = normalize(normal);
  vec3 r = reflect(vec3(0., 0., -1.), n);
  vec3 metal = vec3(.018, .024, .032);
  // Reflections of broad studio lights, a dark horizon, and the red room edge.
  float softbox = exp(-pow((r.y - .55) * 3.3, 4.)) * (1. - smoothstep(.6, 1., abs(r.x)));
  float strip = exp(-pow((r.y + .38 + r.x * .22) * 17., 2.));
  float rim = pow(1. - n.z, 3.);
  metal += vec3(.8, .86, .91) * softbox * 1.4;
  metal += vec3(.92, .96, 1.) * strip * .95;
  metal += vec3(.95, .012, .045) * exp(-pow((r.x + .68) * 4., 2.)) * (.3 + rim);
  metal += vec3(.18, .2, .23) * rim;
  metal *= .68 + .32 * n.z;
  gl_FragColor = vec4(pow(metal, vec3(.65)), smoothstep(.985, 1.035, edge));
}`;

type Drop = { x: number; y: number; vx: number; vy: number; radius: number };

export function chromeToy(ctx: CanvasRenderingContext2D): Toy {
  let width = 1,
    height = 1,
    time = 0,
    wasHeld = false,
    grabbed = -1;
  const drops: Drop[] = [];
  const uniforms = new Float32Array(COUNT * 3);
  const surface = document.createElement("canvas");
  const gl = surface.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    depth: false,
  });
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let resolution: WebGLUniformLocation | null = null;
  let positions: WebGLUniformLocation | null = null;
  if (gl) {
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, i ? fragment : vertex);
      gl.compileShader(shader);
      return shader;
    });
    program = gl.createProgram();
    if (program) {
      for (const shader of shaders) gl.attachShader(program, shader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        program = null;
      } else {
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        resolution = gl.getUniformLocation(program, "resolution");
        positions = gl.getUniformLocation(program, "drops[0]");
      }
    }
    for (const shader of shaders) gl.deleteShader(shader);
  }
  const reset = () => {
    time = 0;
    grabbed = -1;
    wasHeld = false;
    drops.splice(
      0,
      drops.length,
      ...Array.from({ length: COUNT }, (_, i) => ({
        x: Math.cos(i * 2.39996) * (0.25 + i * 0.045),
        y: Math.sin(i * 2.39996) * (0.2 + i * 0.035),
        vx: 0,
        vy: 0,
        radius: i < 3 ? 0.3 - i * 0.025 : 0.12 + (i % 3) * 0.035,
      })),
    );
  };
  reset();
  const nearest = (x: number, y: number) => {
    let index = 0,
      distance = Infinity;
    drops.forEach((drop, i) => {
      const d = Math.hypot(drop.x - x, drop.y - y);
      if (d < distance) {
        distance = d;
        index = i;
      }
    });
    return index;
  };
  return {
    resize(w, h) {
      width = w;
      height = h;
      const scale = Math.min(1, (width < 500 ? 290 : 420) / height, 720 / width);
      surface.width = Math.max(1, Math.round(width * scale));
      surface.height = Math.max(1, Math.round(height * scale));
      gl?.viewport(0, 0, surface.width, surface.height);
    },
    draw(dt, x, y, parameter, active, held) {
      time += dt;
      const aspect = width / height;
      const px = (x - 0.5) * 2 * aspect,
        py = (0.5 - y) * 2;
      if (held && !wasHeld) grabbed = nearest(px, py);
      if (!held) grabbed = -1;
      wasHeld = held;
      const steps = Math.max(1, Math.ceil(dt * 120)),
        h = dt / steps;
      for (let s = 0; s < steps; s++) {
        drops.forEach((drop, i) => {
          const targetX =
            Math.cos(time * 0.2 + i * 2.39996) * (0.24 + i * 0.045) * Math.min(1, aspect);
          const targetY = Math.sin(time * 0.16 + i * 2.39996) * (0.15 + i * 0.03);
          const pull = 0.8 + parameter * 3;
          let ax = (targetX - drop.x) * pull,
            ay = (targetY - drop.y) * pull;
          if (grabbed === i) {
            ax += (px - drop.x) * 65;
            ay += (py - drop.y) * 65;
          } else if (active && !held) {
            const dx = drop.x - px,
              dy = drop.y - py;
            const force = Math.exp(-(dx * dx + dy * dy) * 7) * 5;
            ax += dx * force;
            ay += dy * force;
          }
          const drag = Math.exp(-h * (2 + parameter * 5));
          drop.vx = (drop.vx + ax * h) * drag;
          drop.vy = (drop.vy + ay * h) * drag;
          drop.x = Math.max(
            -aspect + drop.radius * 0.5,
            Math.min(aspect - drop.radius * 0.5, drop.x + drop.vx * h),
          );
          drop.y = Math.max(-0.82, Math.min(0.82, drop.y + drop.vy * h));
        });
      }
      drops.forEach((drop, i) => uniforms.set([drop.x, drop.y, drop.radius], i * 3));
      if (gl && program && !gl.isContextLost()) {
        gl.useProgram(program);
        gl.uniform2f(resolution, surface.width, surface.height);
        gl.uniform3fv(positions, uniforms);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        ctx.drawImage(surface, 0, 0, width, height);
      } else {
        // A lightweight metallic rendering remains playable without WebGL.
        for (const drop of drops) {
          const dx = width / 2 + (drop.x * height) / 2,
            dy = height / 2 - (drop.y * height) / 2;
          const radius = (drop.radius * height) / 2;
          const paint = ctx.createLinearGradient(
            dx - radius,
            dy - radius,
            dx + radius,
            dy + radius,
          );
          for (const [stop, color] of [
            [0, "#efedf0"],
            [0.28, "#5c6371"],
            [0.48, "#101114"],
            [0.55, "#f4eeee"],
            [0.75, "#27232b"],
            [1, "#f32649"],
          ] as const)
            paint.addColorStop(stop, color);
          ctx.fillStyle = paint;
          ctx.beginPath();
          ctx.arc(dx, dy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    action() {
      drops.forEach((drop, i) => {
        drop.vx += Math.cos(i * 2.39996 + time) * 3;
        drop.vy += Math.sin(i * 2.39996 + time) * 3;
      });
    },
    reset,
    dispose() {
      if (gl) {
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    },
  };
}
