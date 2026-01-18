// 数独核心逻辑工具

export interface Cell {
  value: number | null;
  isFixed: boolean; // 是否是初始固定的数字
  isError: boolean; // 是否有错误
}

export type SudokuBoard = Cell[][];

// 生成完整的9x9数独解决方案
export function generateSudoku(): number[][] {
  const board: number[][] = Array(9).fill(null).map(() => Array(9).fill(0));

  // 填充对角线上的3x3格子（它们是独立的）
  fillDiagonalBoxes(board);
  
  // 填充剩余的空格
  solveSudoku(board);
  
  return board;
}

// 填充对角线上的3x3格子
function fillDiagonalBoxes(board: number[][]): void {
  for (let box = 0; box < 9; box += 3) {
    fillBox(board, box, box);
  }
}

// 填充一个3x3的格子
function fillBox(board: number[][], row: number, col: number): void {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  shuffle(nums);
  
  let index = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      board[row + i][col + j] = nums[index++];
    }
  }
}

// 洗牌数组
function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// 解决数独（回溯算法）
function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        shuffle(nums);
        
        for (const num of nums) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

// 检查数字是否有效
function isValid(board: number[][], row: number, col: number, num: number): boolean {
  // 检查行
  for (let j = 0; j < 9; j++) {
    if (board[row][j] === num) return false;
  }
  
  // 检查列
  for (let i = 0; i < 9; i++) {
    if (board[i][col] === num) return false;
  }
  
  // 检查3x3格子
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (board[i][j] === num) return false;
    }
  }
  
  return true;
}

// 根据难度挖空
export function createPuzzle(solution: number[][], difficulty: number): SudokuBoard {
  // 难度对应的挖空数量：1-简单(30), 2-中等(40), 3-困难(48), 4-专家(56)
  const holes = [30, 40, 48, 56][difficulty - 1] || 30;
  
  // 复制解决方案
  const board: SudokuBoard = solution.map(row => 
    row.map(val => ({ value: val, isFixed: true, isError: false }))
  );
  
  // 随机挖空
  const positions: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      positions.push([i, j]);
    }
  }
  
  shuffle(positions);
  
  for (let i = 0; i < holes && i < positions.length; i++) {
    const [row, col] = positions[i];
    board[row][col].value = null;
    board[row][col].isFixed = false;
  }
  
  return board;
}

// 检查数独是否完成
export function checkComplete(board: SudokuBoard, solution: number[][]): boolean {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j].value === null || board[i][j].value !== solution[i][j]) {
        return false;
      }
    }
  }
  return true;
}

// 验证并标记错误
export function validateBoard(board: SudokuBoard, solution: number[][]): boolean {
  let hasError = false;
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = board[i][j];
      if (!cell.isFixed && cell.value !== null) {
        cell.isError = cell.value !== solution[i][j];
        if (cell.isError) {
          hasError = true;
        }
      } else {
        cell.isError = false;
      }
    }
  }
  
  return !hasError;
}

// 深拷贝数独板
export function cloneBoard(board: SudokuBoard): SudokuBoard {
  return board.map(row => 
    row.map(cell => ({ ...cell }))
  );
}
