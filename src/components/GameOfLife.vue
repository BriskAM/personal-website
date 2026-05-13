<template>
  <canvas ref="canvas" class="fixed inset-0 -z-10 w-full h-full pointer-events-none"></canvas>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

const canvas = ref<HTMLCanvasElement | null>(null);
const cellSize = 7; // Increased grid size
const cellColor = '#333333'; // Darker cell color for dark mode
const maxActiveCells = 800; // Hard limit on active cells to prevent clustering
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number;
let resizeFrame: number | null = null;
let cols = 0;
let rows = 0;
let grid: number[][] = [];

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

  for (let i = 0; i < nextCols; i++) {
    for (let j = 0; j < nextRows; j++) {
      if (Math.random() < 0.075) {
        grid[i][j] = 1;
      }
    }
  }
};

const preserveGrid = (nextCols: number, nextRows: number) => {
  const nextGrid = new Array(nextCols).fill(null).map(() => new Array(nextRows).fill(0));
  const copyCols = Math.min(cols, nextCols);
  const copyRows = Math.min(rows, nextRows);

  for (let i = 0; i < copyCols; i++) {
    for (let j = 0; j < copyRows; j++) {
      nextGrid[i][j] = grid[i][j] ?? 0;
    }
  }

  grid = nextGrid;
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

const draw = () => {
  if (!ctx || !canvas.value) return;
  
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  ctx.fillStyle = cellColor;
  
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j] === 1) {
        ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
};

const countActiveCells = (g: number[][]): number => {
  let count = 0;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      count += g[i][j];
    }
  }
  return count;
};

const computeNextGen = () => {
  const nextGrid = grid.map(arr => [...arr]);
  let newCells: [number, number][] = [];

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const state = grid[i][j];
      let neighbors = 0;

      for (let x = -1; x < 2; x++) {
        for (let y = -1; y < 2; y++) {
          if (x === 0 && y === 0) continue;
          
          const col = (i + x + cols) % cols;
          const row = (j + y + rows) % rows;
          neighbors += grid[col][row];
        }
      }

      if (state === 0 && neighbors === 3) {
        nextGrid[i][j] = 1;
        newCells.push([i, j]);
      } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
        nextGrid[i][j] = 0;
      }
    }
  }

  const activeCount = countActiveCells(nextGrid);
  if (activeCount > maxActiveCells) {
    // Randomly remove excess cells
    const activeCells: [number, number][] = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (nextGrid[i][j] === 1) activeCells.push([i, j]);
      }
    }
    for (let i = activeCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeCells[i], activeCells[j]] = [activeCells[j], activeCells[i]];
    }
    const toRemove = activeCells.slice(maxActiveCells);
    for (const [x, y] of toRemove) {
      nextGrid[x][y] = 0;
    }
  }

  grid = nextGrid;
};

const handleMouseMove = (e: MouseEvent) => {
  const x = Math.floor(e.clientX / cellSize);
  const y = Math.floor(e.clientY / cellSize);
  
  // Only add cells if under the limit
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
  
  setCanvasSize();
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('resize', handleResize);
  
  let lastTime = 0;
  const fps = 15;
  const interval = 1000 / fps;

  const throttledLoop = (timestamp: number) => {
      if (timestamp - lastTime >= interval) {
          draw();
          computeNextGen();
          lastTime = timestamp;
      }
      animationId = requestAnimationFrame(throttledLoop);
  };
  
  animationId = requestAnimationFrame(throttledLoop);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('resize', handleResize);
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
  cancelAnimationFrame(animationId);
});
</script>
