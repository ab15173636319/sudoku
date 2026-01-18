<template>
  <view class="game">
    <nut-navbar title="数独游戏" left-show @click-back="back" />

    <view class="game-content">
      <view class="game-header">
        <view class="timer">时间: {{ formatTime(elapsedTime) }}</view>
        <view class="errors">错误: {{ errorCount }}</view>
      </view>

      <view class="sudoku-board">
        <view v-for="(row, rowIndex) in board" :key="rowIndex" class="sudoku-row">
          <view v-for="(cell, colIndex) in row" :key="colIndex" class="sudoku-cell" :class="{
            'fixed': cell.isFixed,
            'error': cell.isError,
            'selected': selectedRow === rowIndex && selectedCol === colIndex,
            'highlight-row-col': isInSelectedRowOrCol(rowIndex, colIndex),
            'user-filled': isUserFilled(cell),
            'box-completed': completedBoxes.has(getBoxIndex(rowIndex, colIndex)),
            'box-animating': animatingBoxes.has(getBoxIndex(rowIndex, colIndex)),
            'border-right-thick': colIndex === 2 || colIndex === 5,
            'border-bottom-thick': rowIndex === 2 || rowIndex === 5
          }" @click="selectCell(rowIndex, colIndex)">
            {{ cell.value || '' }}
          </view>
        </view>
      </view>

      <view class="action-buttons">
        <nut-button type="warning" size="normal" @click="undo">撤销</nut-button>
        <nut-button type="danger" size="normal" @click="clear">清除</nut-button>
        <nut-button type="default" size="normal" @click="restart">重新开始</nut-button>
      </view>

      <view class="number-pad">
        <view class="numberBoard">
          <view v-for="num in 9" :key="num" class="number-btn" @click="inputNumber(num)">
            {{ num }}
          </view>
        </view>
        <nut-button type="danger" size="large" @click="deleteNumber">删除</nut-button>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue';
import Taro, { useLoad } from '@tarojs/taro';
import {
  generateSudoku,
  createPuzzle,
  checkComplete,
  validateBoard,
  cloneBoard
} from '../../utils/sudoku';
import { recordGameStart, recordGameComplete } from '../../utils/statistics';

// 使用 ReturnType 推断类型
type SudokuBoard = ReturnType<typeof createPuzzle>;

const diff = ref(1);
const board = ref<SudokuBoard>([]);
const solution = ref<number[][]>([]);
const selectedRow = ref<number>(-1);
const selectedCol = ref<number>(-1);
const history = ref<SudokuBoard[]>([]);
const isPlaying = ref(false);
const elapsedTime = ref(0);
const timerInterval = ref<number | null>(null);
const errorCount = ref(0);
const startTime = ref<number>(0);
const totalInputs = ref(0); // 总输入次数
// 记录已完成的九宫格，用于动画效果
const completedBoxes = ref<Set<number>>(new Set());
// 记录刚刚完成需要触发动画的九宫格
const animatingBoxes = ref<Set<number>>(new Set());

// 判断单元格是否在同一行或列（用于高亮）
const isInSelectedRowOrCol = (row: number, col: number): boolean => {
  if (selectedRow.value === -1 || selectedCol.value === -1) return false;
  return row === selectedRow.value || col === selectedCol.value;
};

// 判断单元格是否是用户填写的（非固定且非空）
const isUserFilled = (cell: any): boolean => {
  return !cell.isFixed && cell.value !== null;
};

// 获取单元格所在的九宫格索引 (0-8)
const getBoxIndex = (row: number, col: number): number => {
  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  return boxRow * 3 + boxCol;
};

// 检查九宫格是否完成
const checkBoxComplete = (boxIndex: number): boolean => {
  const boxRow = Math.floor(boxIndex / 3) * 3;
  const boxCol = (boxIndex % 3) * 3;

  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      const cell = board.value[i][j];
      if (cell.value === null || cell.value !== solution.value[i][j]) {
        return false;
      }
    }
  }
  return true;
};

// 检查并更新完成的九宫格
const updateCompletedBoxes = (changedRow: number, changedCol: number) => {
  const boxIndex = getBoxIndex(changedRow, changedCol);
  if (checkBoxComplete(boxIndex)) {
    if (!completedBoxes.value.has(boxIndex)) {
      completedBoxes.value.add(boxIndex);
      // 触发动画
      animatingBoxes.value.add(boxIndex);
      // 动画结束后移除动画标记
      setTimeout(() => {
        animatingBoxes.value.delete(boxIndex);
      }, 600);
    }
  } else {
    // 如果九宫格不完整了，移除完成状态（例如撤销操作）
    completedBoxes.value.delete(boxIndex);
    animatingBoxes.value.delete(boxIndex);
  }
};

// 初始化游戏
const initGame = () => {
  // 生成完整的数独解决方案
  solution.value = generateSudoku();
  // 根据难度创建谜题
  board.value = createPuzzle(solution.value, diff.value);
  // 重置状态
  selectedRow.value = -1;
  selectedCol.value = -1;
  history.value = [];
  isPlaying.value = false;
  elapsedTime.value = 0;
  errorCount.value = 0;
  startTime.value = 0;
  totalInputs.value = 0;
  completedBoxes.value.clear();
  animatingBoxes.value.clear();
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
};

// 选择单元格
const selectCell = (row: number, col: number) => {
  if (board.value[row][col].isFixed) return;

  selectedRow.value = row;
  selectedCol.value = col;

  // 如果游戏还没开始，点击第一个空格时开始计时
  if (!isPlaying.value) {
    startTimer();
  }
};

// 检查棋盘是否有错误
const hasErrors = (): boolean => {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board.value[i][j].isError) {
        return true;
      }
    }
  }
  return false;
};

// 输入数字
const inputNumber = (num: number) => {
  if (selectedRow.value === -1 || selectedCol.value === -1) {
    Taro.showToast({ title: '请先选择空格', icon: 'none' });
    return;
  }

  const cell = board.value[selectedRow.value][selectedCol.value];
  if (cell.isFixed) return;

  // 先验证当前棋盘状态，检查是否有错误
  validateBoard(board.value, solution.value);

  // 检查当前选中的格子是否有错误（允许修正错误）
  const isCorrectingError = cell.isError;

  // 如果棋盘中有错误，且当前格子没有错误，则禁止继续填写（必须先修正错误）
  if (hasErrors() && !isCorrectingError) {
    Taro.showToast({ title: '请先修正错误再继续', icon: 'none', duration: 2000 });
    return;
  }

  // 保存到历史记录
  saveToHistory();

  // 输入数字
  const oldValue = cell.value;
  cell.value = num;
  totalInputs.value++; // 记录输入次数

  // 验证并标记错误
  validateBoard(board.value, solution.value);

  // 如果新输入的值是错误的，增加错误计数
  if (cell.isError && oldValue !== num) {
    errorCount.value++;
  }

  // 检查并更新完成的九宫格
  updateCompletedBoxes(selectedRow.value, selectedCol.value);

  // 检查是否完成
  if (checkComplete(board.value, solution.value)) {
    stopTimer();
    const bestTime = getBestTime();
    const currentTime = elapsedTime.value;

    // 记录游戏完成统计
    recordGameComplete(diff.value, currentTime, errorCount.value, totalInputs.value);

    let message = `恭喜完成！用时: ${formatTime(currentTime)}\n错误次数: ${errorCount.value}`;

    if (!bestTime || currentTime < bestTime) {
      saveBestTime(currentTime);
      message += '\n🎉 新的最速记录！';
    } else {
      message += `\n最佳记录: ${formatTime(bestTime)}`;
    }

    Taro.showModal({
      title: '游戏完成',
      content: message,
      showCancel: false,
      success: () => {
        initGame();
      }
    });
  }
};

// 删除数字
const deleteNumber = () => {
  if (selectedRow.value === -1 || selectedCol.value === -1) {
    Taro.showToast({ title: '请先选择空格', icon: 'none' });
    return;
  }

  const cell = board.value[selectedRow.value][selectedCol.value];
  if (cell.isFixed) return;

  saveToHistory();
  cell.value = null;
  cell.isError = false;

  // 检查并更新完成的九宫格（可能因为删除而不再完成）
  updateCompletedBoxes(selectedRow.value, selectedCol.value);
};

// 撤销
const undo = () => {
  if (history.value.length === 0) {
    Taro.showToast({ title: '没有可撤销的操作', icon: 'none' });
    return;
  }

  board.value = history.value.pop()!;
  selectedRow.value = -1;
  selectedCol.value = -1;

  // 重新检查所有九宫格的完成状态
  completedBoxes.value.clear();
  animatingBoxes.value.clear();
  for (let boxIndex = 0; boxIndex < 9; boxIndex++) {
    if (checkBoxComplete(boxIndex)) {
      completedBoxes.value.add(boxIndex);
    }
  }
};

// 清除所有已填写的空格
const clear = () => {
  Taro.showModal({
    title: '确认清除',
    content: '确定要清除所有已填写的空格吗？',
    success: (res) => {
      if (res.confirm) {
        saveToHistory();
        for (let i = 0; i < 9; i++) {
          for (let j = 0; j < 9; j++) {
            if (!board.value[i][j].isFixed) {
              board.value[i][j].value = null;
              board.value[i][j].isError = false;
            }
          }
        }
        selectedRow.value = -1;
        selectedCol.value = -1;

        // 重新检查所有九宫格的完成状态
        completedBoxes.value.clear();
        animatingBoxes.value.clear();
        for (let boxIndex = 0; boxIndex < 9; boxIndex++) {
          if (checkBoxComplete(boxIndex)) {
            completedBoxes.value.add(boxIndex);
          }
        }
      }
    }
  });
};

// 重新开始
const restart = () => {
  Taro.showModal({
    title: '确认重新开始',
    content: '确定要重新开始游戏吗？当前进度将丢失。',
    success: (res) => {
      if (res.confirm) {
        initGame();
      }
    }
  });
};

// 保存到历史记录
const saveToHistory = () => {
  // 只保留最近50步历史
  if (history.value.length >= 50) {
    history.value.shift();
  }
  history.value.push(cloneBoard(board.value));
};

// 开始计时
const startTimer = () => {
  if (isPlaying.value) return;

  isPlaying.value = true;
  startTime.value = Date.now() - elapsedTime.value * 1000;

  timerInterval.value = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000);
  }, 1000) as unknown as number;
};

// 停止计时
const stopTimer = () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
  isPlaying.value = false;
};

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 获取最佳时间
const getBestTime = (): number | null => {
  try {
    const bestTime = Taro.getStorageSync(`best_time_${diff.value}`);
    return bestTime ? Number(bestTime) : null;
  } catch (e) {
    return null;
  }
};

// 保存最佳时间
const saveBestTime = (time: number) => {
  try {
    const bestTime = getBestTime();
    if (!bestTime || time < bestTime) {
      Taro.setStorageSync(`best_time_${diff.value}`, time);
    }
  } catch (e) {
    console.error('保存最佳时间失败', e);
  }
};

// 返回
const back = () => {
  if (isPlaying.value) {
    Taro.showModal({
      title: '提示',
      content: '游戏正在进行中，确定要返回吗？',
      success: (res) => {
        if (res.confirm) {
          stopTimer();
          Taro.switchTab({
            url: '/pages/index/index'
          })
        }
      }
    });
  } else {
    Taro.switchTab({
      url: '/pages/index/index'
    })
  }
};

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 阻止默认行为（如数字键在输入框中的默认行为）
  if (event.key >= '1' && event.key <= '9') {
    event.preventDefault();
    const num = parseInt(event.key);
    inputNumber(num);
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    deleteNumber();
  }
};

// 页面加载时获取参数并初始化
useLoad((options) => {
  diff.value = Number(options.diff) || 1;
  // 记录游戏开始
  recordGameStart(diff.value);
  // 每次进入页面都重置游戏
  initGame();
});

// 添加键盘事件监听（仅在浏览器环境）
onMounted(() => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeyDown);
  }
});

onUnmounted(() => {
  stopTimer();
  // 移除键盘事件监听
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<style lang="scss" scoped>
.game {
  width: 100vw;
  min-height: 100vh;
  background-color: #FFF9E3;
  padding-bottom: 20px;
}


.game-content {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  height: 100%;
  align-items: center;
  box-sizing: border-box;
  padding: 20px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #fff;
  margin-bottom: 10px;

  .timer,
  .errors {
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
}

.sudoku-board {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
}

.sudoku-row {
  display: flex;
  width: 95vw;
  max-width: 900px;
}

.sudoku-cell {
  flex: 1;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  font-weight: bold;
  border: 1px solid #ddd;
  background-color: #fff;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  position: relative;

  &.fixed {
    color: #333;
    background-color: #f0f0f0;
  }

  &.error {
    color: #ff4444;
    background-color: #ffe6e6;
  }

  &.selected {
    background-color: #b3d9ff;
    z-index: 2;
  }

  // 高亮所在行列
  &.highlight-row-col {
    background-color: #e6f3ff;

    &.selected {
      background-color: #b3d9ff;
    }
  }

  // 用户填写的内容为蓝色
  &.user-filled {
    color: #0066cc;
  }

  // 九宫格完成时的样式（数字变为黑色）
  &.box-completed {
    &.user-filled {
      color: #000;
      font-weight: 900;
    }
  }

  &.border-right-thick {
    border-right: 3px solid #333;
  }

  &.border-bottom-thick {
    border-bottom: 3px solid #333;
  }

  &:active {
    transform: scale(0.95);
  }

  // 九宫格完成时的缩放动画
  &.box-animating {
    animation: boxCompleteScale 0.6s ease-in-out;
  }
}

@keyframes boxCompleteScale {
  0% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.08);
  }

  50% {
    transform: scale(0.98);
  }

  75% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

.number-pad {
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  margin-bottom: 20px;


  .numberBoard {
    width: 95vw;
    max-width: 900px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;

    view {
      aspect-ratio: 2.25;
    }
  }

}

.number-btn {
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  font-weight: bold;
  background-color: #fff;
  border: 2px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;

  &.delete-btn {
    grid-column: 4 / 6;
    aspect-ratio: 2 / 1;
    color: #ff4444;
  }

  &:active {
    transform: scale(0.95);
    background-color: #e0e0e0;
  }
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  // padding: 0 20px;
  gap: 10px;
  margin: 40px 0;
}
</style>
