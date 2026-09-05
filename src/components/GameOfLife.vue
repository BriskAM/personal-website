<template>
  <canvas ref="canvas" class="fixed inset-0 z-0 w-full h-full pointer-events-none" aria-hidden="true"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import mordorMap from '../content/lotr_mordor_pixel_map.json';

const canvas = ref<HTMLCanvasElement | null>(null);
const cellSize = 8; // Optimal balance for performance & crisp resolution
const maxActiveCells = 500; // Cap active cells to prevent lag while keeping rich visuals
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number;
let resizeFrame: number | null = null;
let cols = 0;
let rows = 0;
let grid: number[][] = [];
let nextGridBuffer: number[][] = [];
let colorGrid: (string | null)[][] = [];
let isMordorArtActive = false;
let themeObserver: MutationObserver | null = null;

// Mordor palettes for Dark and Light mode
const darkMordorPalette: string[] = mordorMap.palette;
const lightMordorPalette: string[] = mordorMap.palette.map((hex: string, i: number) => {
  if (i >= 24) return hex; // Keep fire/lava/eye vibrant
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const factor = Math.min(1, Math.max(0, (lum - 10) / 84));
  const gray = Math.round(230 - factor * 182);
  return '#' + gray.toString(16).padStart(2, '0').repeat(3);
});

const getCellColor = () => {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('light')
    ? '#deded6'
    : '#333333';
};
let cellColor = '#333333';

const handleThemeChange = () => {
  cellColor = getCellColor();
  if (isMordorArtActive) {
    const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
    const palette = isLight ? lightMordorPalette : darkMordorPalette;
    const mapWidth = mordorMap.width;
    const mapHeight = mordorMap.height;
    const offsetX = Math.floor((cols - mapWidth) / 2);
    const offsetY = Math.floor((rows - mapHeight) / 2);

    for (let my = 0; my < mapHeight; my++) {
      const rowStr = mordorMap.rows[my];
      const gy = my + offsetY;
      if (gy < 0 || gy >= rows) continue;
      for (let mx = 0; mx < mapWidth; mx++) {
        const gx = mx + offsetX;
        if (gx < 0 || gx >= cols) continue;
        if (colorGrid[gx]?.[gy]) {
          const char = rowStr[mx];
          const paletteIdx = parseInt(char, 36);
          colorGrid[gx][gy] = palette[paletteIdx] || palette[0];
        }
      }
    }
    draw();
  }
};

const getViewportSize = () => {
  const isTouchViewport = window.matchMedia('(pointer: coarse)').matches;
  const height = isTouchViewport
    ? Math.max(window.innerHeight, window.screen.height)
    : window.innerHeight;

  return {
    width: window.innerWidth,
    height,
  };
};

const seedGrid = (nextCols: number, nextRows: number) => {
  grid = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(0));
  nextGridBuffer = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(0));
  colorGrid = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(null));
  isMordorArtActive = false;

  for (let i = 0; i < nextCols; i++) {
    for (let j = 0; j < nextRows; j++) {
      if (Math.random() < 0.065) {
        grid[i][j] = 1;
      }
    }
  }
};

const preserveGrid = (nextCols: number, nextRows: number) => {
  const nextGrid = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(0));
  nextGridBuffer = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(0));
  const nextColorGrid: (string | null)[][] = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(null));
  const copyCols = Math.min(cols, nextCols);
  const copyRows = Math.min(rows, nextRows);

  for (let i = 0; i < copyCols; i++) {
    for (let j = 0; j < copyRows; j++) {
      nextGrid[i][j] = grid[i]?.[j] ?? 0;
      nextColorGrid[i][j] = colorGrid[i]?.[j] ?? null;
    }
  }

  grid = nextGrid;
  colorGrid = nextColorGrid;
};

const setCanvasSize = (preserve = false) => {
  if (!canvas.value) return;

  const { width, height } = getViewportSize();
  const nextCols = Math.ceil(width / cellSize);
  const nextRows = Math.ceil(height / cellSize);

  if (preserve && nextCols === cols && nextRows === rows) return;

  canvas.value.width = width;
  canvas.value.height = height;
  canvas.value.style.width = `${width}px`;
  canvas.value.style.height = `${height}px`;

  if (preserve && grid.length > 0) {
    preserveGrid(nextCols, nextRows);
  } else {
    seedGrid(nextCols, nextRows);
  }

  cols = nextCols;
  rows = nextRows;
};

// Batch draws by color to minimize context fillStyle switches
const draw = () => {
  if (!ctx || !canvas.value) return;
  
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

  if (isMordorArtActive) {
    // Group active cells by color to minimize fillStyle switches
    const colorBatches = new Map<string, [number, number][]>();
    const defaultColor = cellColor;

    for (let i = 0; i < cols; i++) {
      const colArr = grid[i];
      if (!colArr) continue;
      for (let j = 0; j < rows; j++) {
        if (colArr[j] === 1) {
          const c = colorGrid[i]?.[j] || defaultColor;
          let list = colorBatches.get(c);
          if (!list) {
            list = [];
            colorBatches.set(c, list);
          }
          list.push([i, j]);
        }
      }
    }

    const s = cellSize - 1;
    for (const [colHex, cells] of colorBatches.entries()) {
      ctx.fillStyle = colHex;
      for (let idx = 0; idx < cells.length; idx++) {
        const [x, y] = cells[idx];
        ctx.fillRect(x * cellSize, y * cellSize, s, s);
      }
    }
  } else {
    // Fast path for standard Game of Life (single color)
    ctx.fillStyle = cellColor;
    const s = cellSize - 1;
    for (let i = 0; i < cols; i++) {
      const colArr = grid[i];
      if (!colArr) continue;
      for (let j = 0; j < rows; j++) {
        if (colArr[j] === 1) {
          ctx.fillRect(i * cellSize, j * cellSize, s, s);
        }
      }
    }
  }
};

const countActiveCells = (g: number[][]): number => {
  let count = 0;
  for (let i = 0; i < cols; i++) {
    const colArr = g[i];
    if (!colArr) continue;
    for (let j = 0; j < rows; j++) {
      count += colArr[j];
    }
  }
  return count;
};

// Zero-allocation Conway computation using pre-allocated double buffer
const computeNextGen = () => {
  let activeCount = 0;
  const activeCells: [number, number][] = [];

  for (let i = 0; i < cols; i++) {
    const prevCol = (i - 1 + cols) % cols;
    const nextCol = (i + 1) % cols;
    const curG = grid[i];
    const prevG = grid[prevCol];
    const nextG = grid[nextCol];
    const targetCol = nextGridBuffer[i];

    for (let j = 0; j < rows; j++) {
      const prevRow = (j - 1 + rows) % rows;
      const nextRow = (j + 1) % rows;

      const neighbors =
        prevG[prevRow] + prevG[j] + prevG[nextRow] +
        curG[prevRow]             + curG[nextRow]  +
        nextG[prevRow] + nextG[j] + nextG[nextRow];

      const state = curG[j];
      let nextState = 0;

      if (state === 0 && neighbors === 3) {
        nextState = 1;
      } else if (state === 1 && (neighbors === 2 || neighbors === 3)) {
        nextState = 1;
      }

      targetCol[j] = nextState;
      if (nextState === 1) {
        activeCount++;
        activeCells.push([i, j]);
      }
    }
  }

  // Cap population if it grows too dense
  if (activeCount > maxActiveCells) {
    const toPrune = activeCount - maxActiveCells;
    for (let k = 0; k < toPrune; k++) {
      const randIdx = Math.floor(Math.random() * activeCells.length);
      const [rx, ry] = activeCells[randIdx];
      nextGridBuffer[rx][ry] = 0;
      activeCells[randIdx] = activeCells[activeCells.length - 1];
      activeCells.pop();
    }
  }

  // Swap buffers without creating any new arrays
  const temp = grid;
  grid = nextGridBuffer;
  nextGridBuffer = temp;
};

let lastMouseX = -1;
let lastMouseY = -1;
let isPaused = false;
let structureIndex = 0;
let isMouseDown = false;
let isDragging = false;
let startDragX = 0;
let startDragY = 0;

const paintCell = (x: number, y: number) => {
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    grid[x][y] = 1;
  }
};

const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    isMouseDown = true;
    isDragging = false;
    startDragX = e.clientX;
    startDragY = e.clientY;

    if (isPaused) {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.command-palette, a, button, input')) return;
      const x = Math.floor(e.clientX / cellSize);
      const y = Math.floor(e.clientY / cellSize);
      paintCell(x, y);
      draw();
    }
  }
};

const handleMouseUp = () => {
  isMouseDown = false;
  setTimeout(() => {
    isDragging = false;
  }, 20);
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isPaused || !e.touches[0]) return;
  const touch = e.touches[0];
  const x = Math.floor(touch.clientX / cellSize);
  const y = Math.floor(touch.clientY / cellSize);
  paintCell(x, y);
  draw();
};

const handleMouseMove = (e: MouseEvent) => {
  const x = Math.floor(e.clientX / cellSize);
  const y = Math.floor(e.clientY / cellSize);
  lastMouseX = x;
  lastMouseY = y;
  
  if (isPaused) {
    // When paused: holding click and moving around draws/activates cells!
    if (isMouseDown || e.buttons === 1) {
      const dist = Math.hypot(e.clientX - startDragX, e.clientY - startDragY);
      if (dist > 3) {
        isDragging = true;
      }
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.command-palette, input')) return;
      paintCell(x, y);
      draw();
    }
    return;
  }

  // When running: ambient subtle activity under limit
  if (countActiveCells(grid) >= maxActiveCells) return;
  
  if (x >= 0 && x < cols && y >= 0 && y < rows) {
    for (let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            if (Math.random() > 0.5) {
                const nx = (x + i + cols) % cols;
                const ny = (y + j + rows) % rows;
                grid[nx][ny] = 1;
            }
        }
    }
  }
};

const structures: [number, number][][] = [
  // 1. Classic Glider (traveling Down-Right / SE)
  [
    [0, -1],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1]
  ],
  // 2. Glider (traveling Down-Left / SW)
  [
    [0, -1],
    [-1, 0],
    [1, 1],
    [0, 1],
    [-1, 1]
  ],
  // 3. Glider (traveling Up-Right / NE)
  [
    [0, 1],
    [1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
  ],
  // 4. Glider (traveling Up-Left / NW)
  [
    [0, 1],
    [-1, 0],
    [1, -1],
    [0, -1],
    [-1, -1]
  ],
  // 5. Lightweight Spaceship (LWSS - travels East)
  [
    [-1, -2], [2, -2],
    [-2, -1],
    [-2, 0], [2, 0],
    [-2, 1], [-1, 1], [0, 1], [1, 1]
  ],
  // 6. Pulsar Oscillator
  [
    [-6, -4], [-6, -3], [-6, -2], [-6, 2], [-6, 3], [-6, 4],
    [-4, -6], [-3, -6], [-2, -6], [2, -6], [3, -6], [4, -6],
    [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
    [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
    [-4, 6], [-3, 6], [-2, 6], [2, 6], [3, 6], [4, 6],
    [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 4],
    [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 4],
    [6, -4], [6, -3], [6, -2], [6, 2], [6, 3], [6, 4]
  ]
];

const spawnStructure = (cx: number, cy: number) => {
  // Clear a clean runway around the click coordinate so the structure can move freely
  for (let dx = -7; dx <= 7; dx++) {
    for (let dy = -7; dy <= 7; dy++) {
      const x = (cx + dx + cols) % cols;
      const y = (cy + dy + rows) % rows;
      grid[x][y] = 0;
    }
  }

  const structure = structures[structureIndex % structures.length];
  structureIndex++;

  for (const [dx, dy] of structure) {
    const x = (cx + dx + cols) % cols;
    const y = (cy + dy + rows) % rows;
    grid[x][y] = 1;
  }
};

const handleWindowClick = (e: MouseEvent) => {
  // If the user was dragging to paint cells while paused, do not stamp a structure over their drawing
  if (isDragging) {
    return;
  }

  const target = e.target as HTMLElement | null;
  // Avoid interfering only when actively interacting inside the command palette modal
  if (target && target.closest('.command-palette')) {
    return;
  }

  const cx = Math.floor(e.clientX / cellSize);
  const cy = Math.floor(e.clientY / cellSize);
  if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
    spawnStructure(cx, cy);
    draw();
  }
};

const handleToggleSimulation = () => {
  isPaused = !isPaused;
  window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
};

let mordorAnimFrame: number | null = null;
let isMordorAssembling = false;

const stopMordorAnimation = () => {
  if (mordorAnimFrame !== null) {
    cancelAnimationFrame(mordorAnimFrame);
    mordorAnimFrame = null;
  }
  isMordorAssembling = false;
};

const setMordorMode = (active: boolean) => {
  if (typeof document !== 'undefined') {
    if (active) {
      document.documentElement.classList.add('mordor-mode');
    } else {
      document.documentElement.classList.remove('mordor-mode');
    }
  }
};

const handleClearGrid = () => {
  stopMordorAnimation();
  isMordorArtActive = false;
  setMordorMode(false);
  grid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
  nextGridBuffer = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
  colorGrid = new Array(cols).fill(null).map(() => new Array(rows).fill(null));
  draw();
};

const handleRandomizeGrid = () => {
  stopMordorAnimation();
  isMordorArtActive = false;
  setMordorMode(false);
  seedGrid(cols, rows);
  if (isPaused) {
    isPaused = false;
    window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
  }
  draw();
};

const handleSpawnGliderGun = (customX?: number, customY?: number) => {
  stopMordorAnimation();
  isMordorArtActive = false;
  setMordorMode(false);
  let startX = customX;
  let startY = customY;
  if (startX === undefined || startY === undefined) {
    if (lastMouseX >= 0 && lastMouseY >= 0) {
      startX = lastMouseX - 18;
      startY = lastMouseY - 5;
    } else {
      startX = Math.max(4, Math.floor(cols / 4));
      startY = Math.max(4, Math.floor(rows / 4));
    }
  }

  const gunOffsets: [number, number][] = [
    [1, 5], [1, 6], [2, 5], [2, 6],
    [11, 5], [11, 6], [11, 7],
    [12, 4], [12, 8],
    [13, 3], [13, 9],
    [14, 3], [14, 9],
    [15, 6],
    [16, 4], [16, 8],
    [17, 5], [17, 6], [17, 7],
    [18, 6],
    [21, 3], [21, 4], [21, 5],
    [22, 3], [22, 4], [22, 5],
    [23, 2], [23, 6],
    [25, 1], [25, 2], [25, 6], [25, 7],
    [35, 3], [35, 4], [36, 3], [36, 4]
  ];
  for (let x = startX - 2; x <= startX + 40; x++) {
    for (let y = startY - 2; y <= startY + 12; y++) {
      const gx = (x + cols) % cols;
      const gy = (y + rows) % rows;
      grid[gx][gy] = 0;
    }
  }
  for (const [dx, dy] of gunOffsets) {
    const gx = (startX + dx + cols) % cols;
    const gy = (startY + dy + rows) % rows;
    grid[gx][gy] = 1;
  }
  if (isPaused) {
    isPaused = false;
    window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
  }
  draw();
};

const handleSpawnPulsar = (customX?: number, customY?: number) => {
  stopMordorAnimation();
  isMordorArtActive = false;
  setMordorMode(false);
  let cx = customX;
  let cy = customY;
  if (cx === undefined || cy === undefined) {
    if (lastMouseX >= 0 && lastMouseY >= 0) {
      cx = lastMouseX;
      cy = lastMouseY;
    } else {
      cx = Math.floor(cols / 2);
      cy = Math.floor(rows / 2);
    }
  }

  const pulsarOffsets: [number, number][] = [
    [-6, -4], [-6, -3], [-6, -2], [-6, 2], [-6, 3], [-6, 4],
    [-4, -6], [-3, -6], [-2, -6], [2, -6], [3, -6], [4, -6],
    [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
    [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
    [-4, 6], [-3, 6], [-2, 6], [2, 6], [3, 6], [4, 6],
    [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 4],
    [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 4],
    [6, -4], [6, -3], [6, -2], [6, 2], [6, 3], [6, 4]
  ];
  for (let dx = -8; dx <= 8; dx++) {
    for (let dy = -8; dy <= 8; dy++) {
      const gx = (cx + dx + cols) % cols;
      const gy = (cy + dy + rows) % rows;
      grid[gx][gy] = 0;
    }
  }
  for (const [dx, dy] of pulsarOffsets) {
    const gx = (cx + dx + cols) % cols;
    const gy = (cy + dy + rows) % rows;
    grid[gx][gy] = 1;
  }
  if (isPaused) {
    isPaused = false;
    window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
  }
  draw();
};

// Character sets for living cells when Conway simulation is resumed
const mordorFireChars = new Set(['o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w']);
const mordorStructureChars = new Set(['6', 'b', 'i', '9', 'e', '0', 'd', 'g', 'h', 'l', 'n']);

interface TargetPixel {
  gx: number;
  gy: number;
  color: string;
  isAlive: boolean;
  priority: number;
}

const exitMordorSmoothly = () => {
  stopMordorAnimation();
  setMordorMode(false);

  // Soft dissolve: randomly prune non-essential pixels over ~300ms, then re-seed and resume
  const activeCells: [number, number][] = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i]?.[j] === 1) activeCells.push([i, j]);
    }
  }

  // Shuffle
  for (let i = activeCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeCells[i], activeCells[j]] = [activeCells[j], activeCells[i]];
  }

  let dissolveIndex = 0;
  const total = activeCells.length;
  const dissolveBatch = Math.max(40, Math.ceil(total / 18)); // ~18 frames (~300ms)

  const stepDissolve = () => {
    const nextIdx = Math.min(total, dissolveIndex + dissolveBatch);
    for (let k = dissolveIndex; k < nextIdx; k++) {
      const [x, y] = activeCells[k];
      grid[x][y] = 0;
      if (colorGrid[x]) colorGrid[x][y] = null;
    }
    dissolveIndex = nextIdx;
    draw();

    if (dissolveIndex < total) {
      mordorAnimFrame = requestAnimationFrame(stepDissolve);
    } else {
      isMordorArtActive = false;
      mordorAnimFrame = null;
      // Re-seed grid with ambient Conway patterns
      seedGrid(cols, rows);
      // Automatically resume simulation so animations don't stay paused!
      isPaused = false;
      window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
      draw();
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Exited Mordor view');
      }
    }
  };

  mordorAnimFrame = requestAnimationFrame(stepDissolve);
};

const handleSpawnMordorScene = () => {
  stopMordorAnimation();

  // If already active and assembled, pressing M acts as a smooth transition exit
  if (isMordorArtActive && !isMordorAssembling) {
    exitMordorSmoothly();
    return;
  }

  // Engage Mordor mode: mute and make foreground translucent
  setMordorMode(true);
  isMordorArtActive = true;
  isMordorAssembling = true;

  // Pause simulation while pixels assemble into place
  if (!isPaused) {
    isPaused = true;
    window.dispatchEvent(new CustomEvent('game-of-life-status', { detail: { paused: isPaused } }));
  }

  // Clear existing grid
  grid = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
  nextGridBuffer = new Array(cols).fill(null).map(() => new Array(rows).fill(0));
  colorGrid = new Array(cols).fill(null).map(() => new Array(rows).fill(null));

  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const palette = isLight ? lightMordorPalette : darkMordorPalette;

  const mapWidth = mordorMap.width;
  const mapHeight = mordorMap.height;

  // Center the 216x140 pixel map horizontally and vertically within canvas grid
  const offsetX = Math.floor((cols - mapWidth) / 2);
  const offsetY = Math.floor((rows - mapHeight) / 2);

  const pixelQueue: TargetPixel[] = [];

  for (let my = 0; my < mapHeight; my++) {
    const rowStr = mordorMap.rows[my];
    const gy = my + offsetY;
    if (gy < 0 || gy >= rows) continue;

    for (let mx = 0; mx < mapWidth; mx++) {
      const gx = mx + offsetX;
      if (gx < 0 || gx >= cols) continue;

      const char = rowStr[mx];
      const paletteIdx = parseInt(char, 36);
      const color = palette[paletteIdx] || palette[0];
      const isFire = mordorFireChars.has(char);
      const isStructure = mordorStructureChars.has(char);
      const isAlive = isFire || isStructure;

      // Stage priority:
      // Priority 1: Fiery Eye of Sauron and Mount Doom lava flow
      // Priority 2: Tower spires of Barad-dûr, mountain crags, overlook cliff & hobbits
      // Priority 3: Atmospheric storm sky & ambient shadow terrain
      const priority = isFire ? 1 : isStructure ? 2 : 3;

      pixelQueue.push({
        gx,
        gy,
        color,
        isAlive,
        priority
      });
    }
  }

  // Shuffle within stages so pixels rain and assemble organically
  pixelQueue.sort((a, b) => a.priority - b.priority || Math.random() - 0.5);

  let currentIndex = 0;
  const totalPixels = pixelQueue.length;
  // Total assembly over ~2.4 seconds at 60fps (~144 frames)
  const batchSize = Math.max(80, Math.ceil(totalPixels / 130));

  const stepAssembly = () => {
    if (!isMordorArtActive) {
      stopMordorAnimation();
      return;
    }

    const targetIndex = Math.min(totalPixels, currentIndex + batchSize);
    for (let i = currentIndex; i < targetIndex; i++) {
      const p = pixelQueue[i];
      colorGrid[p.gx][p.gy] = p.color;
      if (p.isAlive) {
        grid[p.gx][p.gy] = 1;
      }
    }
    currentIndex = targetIndex;
    draw();

    if (currentIndex < totalPixels) {
      mordorAnimFrame = requestAnimationFrame(stepAssembly);
    } else {
      // Completed assembly
      isMordorAssembling = false;
      mordorAnimFrame = null;
      // @ts-ignore
      if (typeof window !== 'undefined' && window.showToast) {
        // @ts-ignore
        window.showToast('Mordor assembled. Press Space to animate, or Esc to exit.');
      }
    }
  };

  mordorAnimFrame = requestAnimationFrame(stepAssembly);
};

const handleKeyDown = (e: KeyboardEvent) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'Escape') {
    if (isMordorArtActive) {
      exitMordorSmoothly();
      return;
    }
  }

  if (e.code === 'Space') {
    e.preventDefault();
    handleToggleSimulation();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.showToast) {
      // @ts-ignore
      window.showToast(isPaused ? 'Simulation paused' : 'Simulation running');
    }
  } else if (e.key === 'm' || e.key === 'M') {
    handleSpawnMordorScene();
  } else if (e.key === 'c' || e.key === 'C') {
    handleClearGrid();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.showToast) {
      // @ts-ignore
      window.showToast('Grid cleared');
    }
  } else if (e.key === 'r' || e.key === 'R') {
    handleRandomizeGrid();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.showToast) {
      // @ts-ignore
      window.showToast('Grid randomized');
    }
  } else if (e.key === 'g' || e.key === 'G') {
    handleSpawnGliderGun();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.showToast) {
      // @ts-ignore
      window.showToast('Glider Gun spawned');
    }
  } else if (e.key === 'p' || e.key === 'P') {
    handleSpawnPulsar();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.showToast) {
      // @ts-ignore
      window.showToast('Pulsar oscillator spawned');
    }
  }
};

const handleResize = () => {
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    setCanvasSize(true);
    resizeFrame = null;
  });
};

onMounted(() => {
  if (!canvas.value) return;
  ctx = canvas.value.getContext('2d');
  
  cellColor = getCellColor();
  window.addEventListener('theme-change', handleThemeChange);
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('toggle-game-of-life', handleToggleSimulation);
  window.addEventListener('clear-game-of-life', handleClearGrid);
  window.addEventListener('randomize-game-of-life', handleRandomizeGrid);
  window.addEventListener('spawn-glider-gun', () => handleSpawnGliderGun());
  window.addEventListener('spawn-pulsar', () => handleSpawnPulsar());
  window.addEventListener('spawn-mordor', () => handleSpawnMordorScene());
  themeObserver = new MutationObserver(handleThemeChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  setCanvasSize();
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('touchmove', handleTouchMove, { passive: true });
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  
  let lastTime = 0;
  const fps = 15;
  const interval = 1000 / fps;

  const throttledLoop = (timestamp: number) => {
      if (timestamp - lastTime >= interval) {
          draw();
          if (!isPaused) {
              computeNextGen();
          }
          lastTime = timestamp;
      }
      animationId = requestAnimationFrame(throttledLoop);
  };
  
  animationId = requestAnimationFrame(throttledLoop);
});

onBeforeUnmount(() => {
  stopMordorAnimation();
  setMordorMode(false);
  window.removeEventListener('theme-change', handleThemeChange);
  window.removeEventListener('click', handleWindowClick);
  window.removeEventListener('mousedown', handleMouseDown);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('touchmove', handleTouchMove);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('toggle-game-of-life', handleToggleSimulation);
  window.removeEventListener('clear-game-of-life', handleClearGrid);
  window.removeEventListener('randomize-game-of-life', handleRandomizeGrid);
  window.removeEventListener('spawn-mordor', () => handleSpawnMordorScene());
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
  cancelAnimationFrame(animationId);
});
</script>
