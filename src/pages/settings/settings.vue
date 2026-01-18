<template>
  <view class="settings" :class="themeClass">
    <nut-navbar title="设置" left-show @click-back="back" />
    
    <view class="settings-content">
      <!-- 主题设置 -->
      <view class="settings-section">
        <view class="section-title">主题设置</view>
        <nut-cell-group>
          <nut-cell title="主题模式" :desc="themeModeText" @click="showThemePicker = true" />
        </nut-cell-group>
        <nut-picker
          v-model:visible="showThemePicker"
          :columns="themeOptions"
          @confirm="handleThemeChange"
        />
      </view>

      <!-- 统计数据 -->
      <view class="settings-section">
        <view class="section-title">游戏统计</view>
        <view class="stats-container">
          <view 
            v-for="(diff, index) in difficultyList" 
            :key="index"
            class="stats-card"
          >
            <view class="stats-header">
              <view class="stats-title">{{ diff.text }}</view>
              <nut-button 
                v-if="hasStats(index + 1)"
                type="danger" 
                size="small" 
                plain
                @click="clearStats(index + 1)"
              >
                清除
              </nut-button>
            </view>
            <view v-if="hasStats(index + 1)" class="stats-content">
              <view class="stats-item">
                <text class="stats-label">游戏次数：</text>
                <text class="stats-value">{{ getStats(index + 1).playCount }}</text>
              </view>
              <view class="stats-item">
                <text class="stats-label">通关次数：</text>
                <text class="stats-value">{{ getStats(index + 1).winCount }}</text>
              </view>
              <view class="stats-item">
                <text class="stats-label">最快通关：</text>
                <text class="stats-value">
                  {{ getStats(index + 1).bestTime ? formatTime(getStats(index + 1).bestTime!) : '暂无' }}
                </text>
              </view>
              <view class="stats-item">
                <text class="stats-label">准确率：</text>
                <text class="stats-value">{{ calculateAccuracy(getStats(index + 1)) }}%</text>
              </view>
            </view>
            <view v-else class="stats-empty">
              暂无统计数据
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Taro from '@tarojs/taro';
import diff from '../../assets/diff';
import { 
  getAllStatistics, 
  getStatistics, 
  calculateAccuracy,
  clearAllStatistics,
  type AllStatistics 
} from '../../utils/statistics';
import { getThemeMode, setThemeMode, type ThemeMode } from '../../utils/theme';

const difficultyList = diff;
const showThemePicker = ref(false);
const themeMode = ref<ThemeMode>(getThemeMode());
const statistics = ref<AllStatistics>({});

// 主题选项
const themeOptions = [
  { text: '浅色模式', value: 'light' },
  { text: '暗黑模式', value: 'dark' },
  { text: '跟随系统', value: 'auto' }
];

// 主题模式文本
const themeModeText = computed(() => {
  const option = themeOptions.find(opt => opt.value === themeMode.value);
  return option?.text || '浅色模式';
});

// 主题类名
const themeClass = computed(() => {
  return themeMode.value === 'dark' ? 'dark-theme' : 'light-theme';
});

// 获取统计数据
const getStats = (difficulty: number) => {
  return statistics.value[difficulty] || getStatistics(difficulty);
};

// 判断是否有统计数据
const hasStats = (difficulty: number) => {
  const stats = getStats(difficulty);
  return stats.playCount > 0;
};

// 格式化时间
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 主题切换
const handleThemeChange = ({ selectedOptions }: any) => {
  const newMode = selectedOptions[0]?.value as ThemeMode;
  if (newMode) {
    themeMode.value = newMode;
    setThemeMode(newMode);
  }
};

// 清除统计数据
const clearStats = (difficulty: number) => {
  Taro.showModal({
    title: '确认清除',
    content: `确定要清除${difficultyList[difficulty - 1]?.text}的统计数据吗？`,
    success: (res) => {
      if (res.confirm) {
        try {
          Taro.removeStorageSync(`stats_${difficulty}`);
          statistics.value = getAllStatistics();
          Taro.showToast({ title: '已清除', icon: 'success' });
        } catch (e) {
          Taro.showToast({ title: '清除失败', icon: 'error' });
        }
      }
    }
  });
};

// 返回
const back = () => {
  Taro.navigateBack();
};

// 加载统计数据
onMounted(() => {
  statistics.value = getAllStatistics();
});
</script>

<style lang="scss" scoped>
.settings {
  width: 100vw;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 20px;
  transition: background-color 0.3s;

  &.dark-theme {
    background-color: #1a1a1a;
    color: #fff;

    .settings-section {
      background-color: #2a2a2a;
      color: #fff;
    }

    .stats-card {
      background-color: #2a2a2a;
      border-color: #444;
      color: #fff;
    }

    .stats-label {
      color: #ccc;
    }

    .stats-empty {
      color: #888;
    }
  }

  &.light-theme {
    background-color: #f5f5f5;
  }
}

.settings-content {
  padding: 10px;
}

.settings-section {
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
  transition: background-color 0.3s;
}

.section-title {
  padding: 15px 20px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  color: #333;
}

.stats-container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.stats-card {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  transition: background-color 0.3s, border-color 0.3s;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.stats-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.stats-label {
  color: #666;
  flex: 1;
}

.stats-value {
  color: #333;
  font-weight: bold;
}

.stats-empty {
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-size: 14px;
}

// 暗黑模式样式覆盖
.dark-theme {
  .section-title {
    color: #fff;
    border-bottom-color: #444;
  }

  .stats-header {
    border-bottom-color: #444;
  }

  .stats-title {
    color: #fff;
  }

  .stats-value {
    color: #fff;
  }
}
</style>
