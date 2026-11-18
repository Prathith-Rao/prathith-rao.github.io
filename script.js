const projects = [...document.querySelectorAll("[data-categories]")];
const filters = document.querySelector(".filters");
const filterButtons = [...filters.querySelectorAll("button")];
const filterStatus = document.querySelector("#filter-status");

filters.hidden = false;
for (const button of filterButtons) {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    let visibleCount = 0;

    for (const project of projects) {
      const matches = filter === "all" || project.dataset.categories.split(" ").includes(filter);
      project.hidden = !matches;
      if (matches) visibleCount += 1;
    }

    for (const option of filterButtons) {
      option.setAttribute("aria-pressed", String(option === button));
    }

    filterStatus.textContent = visibleCount === 1 ? "1 project shown." : `${visibleCount} projects shown.`;
  });
}

const glyphs = {
  server: [
    "01111111110", "01000001010", "01111111110", "00000000000", "01111111110",
    "01000001010", "01111111110", "00000100000", "01111111110",
  ],
  chart: [
    "10000000111", "10000000011", "10000000101", "10000001000", "10010010000",
    "10101100000", "11000000000", "10000000000", "11111111111",
  ],
  wave: [
    "00000100000", "00000100000", "00010101000", "01010101010", "11010101011",
    "01010101010", "00010101000", "00000100000", "00000100000",
  ],
  hash: [
    "00001001000", "00001001000", "01111111110", "00010010000", "00010010000",
    "11111111100", "00100100000", "00100100000", "00100100000",
  ],
  spark: [
    "00000100000", "00000100000", "00001110000", "00111111100", "11111111111",
    "00111111100", "00001110000", "00000100000", "00000100000",
  ],
  arch: [
    "00011111000", "00100000100", "01000000010", "01001110010", "01010001010",
    "01010001010", "01010001010", "11110001111", "11110001111",
  ],
};

for (const element of document.querySelectorAll("[data-icon]")) {
  const dots = document.createDocumentFragment();
  for (const bit of glyphs[element.dataset.icon].join("")) {
    const dot = document.createElement("i");
    if (bit === "1") dot.className = "on";
    dots.append(dot);
  }
  element.append(dots);
}

const canvas = document.querySelector("#matrix");
const pen = canvas.getContext("2d");
const typewriter = document.querySelector("#typewriter");
const motionButton = document.querySelector("#motion");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const turns = Math.PI * 2;
const points = [];
const pointCount = 1280;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

for (let index = 0; index < pointCount; index += 1) {
  const y = 1 - (2 * (index + .5)) / pointCount;
  const theta = index * goldenAngle;
  const radius = Math.sqrt(1 - y * y);
  points.push({ x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius, theta });
}

const phrases = ["I build for the cloud.", "I tinker with Linux.", "I prototype with ML."];
const phraseDuration = 3950;
let playing = !reducedMotion.matches;
let inView = true;
let frame = 0;
let elapsed = 0;
let previous = 0;
let lastPaint = -Infinity;
let width = 0;
let height = 0;
let pointerX = 0;
let pointerY = 0;

function drawOrbit(cx, cy, radius, angle, phase) {
  for (let step = 0; step < 112; step += 1) {
    const turn = step / 112 * turns;
    const x = radius * Math.cos(turn);
    const y = radius * .285 * Math.sin(turn);
    const brightness = .18 + .5 * Math.max(0, Math.cos(turn - phase));
    pen.fillStyle = `rgba(194, 160, 252, ${brightness})`;
    pen.beginPath();
    pen.arc(cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle), step % 14 === 0 ? 2 : 1, 0, turns);
    pen.fill();
  }
}

function drawMatrix(time) {
  if (!pen || width === 0 || height === 0) return;
  const t = time * .001;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * .312;
  const yaw = t * .32 + pointerX * .32;
  const tilt = -.33 + pointerY * .2;
  const cosine = Math.cos(yaw);
  const sine = Math.sin(yaw);
  const tiltCosine = Math.cos(tilt);
  const tiltSine = Math.sin(tilt);
  pen.clearRect(0, 0, width, height);

  drawOrbit(cx, cy, radius * 1.34, -.36, t * .8);
  drawOrbit(cx, cy, radius * 1.27, .85, t * .65 + 2);

  for (const point of points) {
    const rotatedX = point.x * cosine + point.z * sine;
    const rotatedZ = point.z * cosine - point.x * sine;
    const y = point.y * tiltCosine - rotatedZ * tiltSine;
    const z = point.y * tiltSine + rotatedZ * tiltCosine;
    const depth = (z + 1) / 2;
    const wave = Math.sin(point.theta * 3 + point.y * 8 + t * 1.15);
    const glow = Math.pow((wave + 1) / 2, 3);
    const scale = radius * (1 + .085 * wave) * (1 + .14 * z);
    const opacity = .13 + depth * (.44 + .4 * glow);
    const dot = (.7 + depth * (1.15 + .9 * glow)) * Math.max(.68, Math.min(1.25, radius / 140));

    pen.fillStyle = `rgba(${Math.round(151 + 88 * glow)}, ${Math.round(116 + 98 * glow)}, 254, ${opacity})`;
    pen.beginPath();
    pen.arc(cx + rotatedX * scale, cy + y * scale, dot, 0, turns);
    pen.fill();
  }
}

function drawTypewriter(time) {
  const phrase = phrases[Math.floor(time / phraseDuration) % phrases.length];
  const step = time % phraseDuration;
  const typed = Math.floor(step / 53);
  const remaining = Math.ceil((phraseDuration - step - 175) / 32);
  const visible = phrase.slice(0, Math.max(0, Math.min(typed, remaining, phrase.length)));
  if (typewriter.textContent !== visible) typewriter.textContent = visible;
}

function tick(now) {
  if (previous) elapsed += now - previous;
  previous = now;
  if (now - lastPaint >= 30) {
    drawMatrix(elapsed);
    drawTypewriter(elapsed);
    lastPaint = now;
  }
  frame = requestAnimationFrame(tick);
}

function syncMotion() {
  const shouldAnimate = playing && inView && !document.hidden;
  if (shouldAnimate && !frame) {
    previous = 0;
    lastPaint = -Infinity;
    frame = requestAnimationFrame(tick);
  } else if (!shouldAnimate && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  document.documentElement.classList.toggle("is-playing", shouldAnimate);
}

function setPlaying(value) {
  playing = value;
  motionButton.firstChild.textContent = value ? "Pause animation " : "Play animation ";
  motionButton.lastElementChild.textContent = value ? "Ⅱ" : "▶";
  if (!value) {
    typewriter.textContent = phrases[0];
    pointerX = 0;
    pointerY = 0;
    drawMatrix(elapsed);
  }
  syncMotion();
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  pen.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawMatrix(elapsed);
}

if (pen) {
  resizeCanvas();
  new ResizeObserver(resizeCanvas).observe(canvas);
  canvas.addEventListener("pointermove", (event) => {
    if (!playing || event.pointerType === "touch") return;
    const bounds = canvas.getBoundingClientRect();
    pointerX = (event.clientX - bounds.left) / bounds.width - .5;
    pointerY = (event.clientY - bounds.top) / bounds.height - .5;
  });
  canvas.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });
}

new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncMotion();
}).observe(document.querySelector(".hero"));

motionButton.hidden = false;
motionButton.addEventListener("click", () => setPlaying(!playing));
document.addEventListener("visibilitychange", syncMotion);
reducedMotion.addEventListener("change", (event) => setPlaying(!event.matches));
setPlaying(playing);
