// 游戏统计数据工具

import Taro from '@tarojs/taro';

export interface GameStatistics {
  playCount: number; // 游戏次数
  winCount: number; // 通关次数
  totalErrors: number; // 总错误次数
  totalInputs: number; // 总输入次数
  bestTime: number | null; // 最快通关时间（秒）
}

export interface AllStatistics {
  [difficulty: number]: GameStatistics;
}

// 获取指定难度的统计数据
export function getStatistics(difficulty: number): GameStatistics {
  try {
    const stats = Taro.getStorageSync(`stats_${difficulty}`);
    if (stats) {
      return JSON.parse(stats);
    }
  } catch (e) {
    console.error('获取统计数据失败', e);
  }
  
  // 返回默认值
  return {
    playCount: 0,
    winCount: 0,
    totalErrors: 0,
    totalInputs: 0,
    bestTime: null
  };
}

// 保存统计数据
export function saveStatistics(difficulty: number, stats: GameStatistics) {
  try {
    Taro.setStorageSync(`stats_${difficulty}`, JSON.stringify(stats));
  } catch (e) {
    console.error('保存统计数据失败', e);
  }
}

// 记录游戏开始
export function recordGameStart(difficulty: number) {
  const stats = getStatistics(difficulty);
  stats.playCount++;
  saveStatistics(difficulty, stats);
}

// 记录游戏完成
export function recordGameComplete(
  difficulty: number,
  time: number,
  errorCount: number,
  totalInputs: number
) {
  const stats = getStatistics(difficulty);
  stats.winCount++;
  stats.totalErrors += errorCount;
  stats.totalInputs += totalInputs;
  
  // 更新最快通关时间
  if (!stats.bestTime || time < stats.bestTime) {
    stats.bestTime = time;
  }
  
  saveStatistics(difficulty, stats);
}

// 计算准确率
export function calculateAccuracy(stats: GameStatistics): number {
  if (stats.totalInputs === 0) return 0;
  return Math.round(((stats.totalInputs - stats.totalErrors) / stats.totalInputs) * 100);
}

// 获取所有难度的统计数据
export function getAllStatistics(): AllStatistics {
  const allStats: AllStatistics = {};
  for (let i = 1; i <= 4; i++) {
    allStats[i] = getStatistics(i);
  }
  return allStats;
}

// 清除所有统计数据
export function clearAllStatistics() {
  try {
    for (let i = 1; i <= 4; i++) {
      Taro.removeStorageSync(`stats_${i}`);
    }
  } catch (e) {
    console.error('清除统计数据失败', e);
  }
}
