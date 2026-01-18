<template>
  <view class="index">
    <nut-navbar title="数独游戏" />
    <view class="content">
      <view class="module">
        <nut-cell title="难度" @click="handleClick" :desc="currentDiffValue" />
        <nut-cascader v-model:visible="show" :options="diff" @change="handleChange" />
      </view>

      <view class="button-group">
        <nut-button style="flex: 1;" type="info" size="normal" @click="startGame">开始游戏</nut-button>
        <nut-button type="primary" @click="showSettings = true">
          <template #icon>
            <Setting />
          </template>
        </nut-button>
      </view>

      <view class="rules-section">
        <nut-button type="default" size="normal" plain @click="showRules = true">规则说明</nut-button>
      </view>
    </view>

    <!-- 规则说明弹框 -->
    <nut-popup v-model:visible="showRules" position="center" round closeable
      :style="{ width: '90%', maxWidth: '500px' }">
      <view class="rules-popup">
        <view class="rules-header">
          <view class="rules-title">游戏规则</view>
        </view>
        <view class="rules-content">
          <view class="rule-item">
            <view class="rule-title">📋 基本规则</view>
            <view class="rule-text">数独是一个9×9的网格游戏，目标是用数字1-9填满所有空格。</view>
          </view>
          <view class="rule-item">
            <view class="rule-title">✅ 填写规则</view>
            <view class="rule-text">每一行、每一列、每一个3×3的九宫格内，数字1-9都必须出现且只能出现一次。</view>
          </view>
          <view class="rule-item">
            <view class="rule-title">🎮 操作方法</view>
            <view class="rule-text">• 点击空格选中单元格<br />• 点击数字键盘输入数字<br />• 按数字键1-9或点击数字按钮输入<br />•
              按Delete键或点击删除按钮清除<br />•
              使用撤销功能返回上一步</view>
          </view>
          <view class="rule-item">
            <view class="rule-title">⚠️ 错误提示</view>
            <view class="rule-text">• 错误的数字会显示为红色<br />• 存在错误时无法继续填写其他格子<br />• 必须先修正所有错误才能继续游戏</view>
          </view>
          <view class="rule-item">
            <view class="rule-title">🎯 完成条件</view>
            <view class="rule-text">当所有空格都被正确填写，且符合数独规则时，游戏完成。九宫格完成时会有动画提示。</view>
          </view>
          <view class="rule-item">
            <view class="rule-title">📊 难度说明</view>
            <view class="rule-text">• 简单：30个空格<br />• 中等：40个空格<br />• 困难：48个空格<br />• 专家：56个空格</view>
          </view>
        </view>
      </view>
    </nut-popup>

    <!-- 设置弹框 -->
    <nut-popup v-model:visible="showSettings" position="bottom" :style="{ height: '80%' }" round closeable
      @close="loadStatistics">
      <view class="settings-popup" :class="themeClass">
        <view class="settings-header">
          <view class="settings-title">设置</view>
        </view>

        <view class="settings-content">
          <!-- 主题设置 -->
          <!-- <view class="settings-section">
            <view class="section-title">主题设置</view>
            <nut-cell-group>
              <nut-cell title="主题模式" :desc="themeModeText" @click="showThemePicker = true" />
            </nut-cell-group>
            <nut-picker v-model:visible="showThemePicker" :columns="themeOptions" @confirm="handleThemeChange" />
          </view> -->

          <!-- 统计数据 -->
          <view class="settings-section">
            <view class="section-title">游戏统计</view>
            <view class="stats-container">
              <view v-for="(diffItem, index) in diff" :key="index" class="stats-card">
                <view class="stats-header">
                  <view class="stats-title">{{ diffItem.text }}</view>
                  <nut-button v-if="hasStats(index + 1)" type="danger" size="small" plain
                    @click="clearStats(index + 1)">
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
    </nut-popup>
  </view>
</template>

<script setup lang="ts">
import { Setting } from "@nutui/icons-vue-taro";
import diff from "../../assets/diff";
import { ref, computed, onMounted } from "vue";
import Taro from "@tarojs/taro";
import {
  getAllStatistics,
  getStatistics,
  calculateAccuracy
} from '../../utils/statistics';
import { getThemeMode, setThemeMode } from '../../utils/theme';

const show = ref(false);
const showSettings = ref(false);
const showRules = ref(false);
const showThemePicker = ref(false);
const currentDiff = ref("1");
const currentDiffValue = ref("简单");
const themeMode = ref(getThemeMode());
const statistics = ref<any>({});

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

const handleClick = () => {
  show.value = true;
};

function handleChange(value: any[]) {
  currentDiff.value = value[value.length - 1];
  currentDiffValue.value =
    diff.find((item) => item.value === currentDiff.value)?.text || "";
}

const startGame = () => {
  Taro.navigateTo({
    url: `pages/game/game?diff=${currentDiff.value}`,
  });
};

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
  const newMode = selectedOptions[0]?.value as 'light' | 'dark' | 'auto';
  if (newMode) {
    themeMode.value = newMode;
    setThemeMode(newMode);
  }
};

// 清除统计数据
const clearStats = (difficulty: number) => {
  Taro.showModal({
    title: '确认清除',
    content: `确定要清除${diff[difficulty - 1]?.text}的统计数据吗？`,
    success: (res) => {
      if (res.confirm) {
        try {
          Taro.removeStorageSync(`stats_${difficulty}`);
          loadStatistics();
          Taro.showToast({ title: '已清除', icon: 'success' });
        } catch (e) {
          Taro.showToast({ title: '清除失败', icon: 'error' });
        }
      }
    }
  });
};

// 加载统计数据
const loadStatistics = () => {
  statistics.value = getAllStatistics();
};

onMounted(() => {
  loadStatistics();
});
</script>
<style lang="scss" scoped>
.index {
  width: 100vw;
  height: 100vh;
  background-color: #FFF9E3;
  position: relative;
  overflow: hidden;

  .content {
    width: 100%;
    max-width: 960px;
    margin: 0 auto;
    height: 100%;
    align-items: center;
    box-sizing: border-box;
    padding: 20px;
    margin-top: 200px;

    .button-group {
      width: 100%;
      box-sizing: border-box;
      display: flex;
      gap: 15px;
      justify-content: center;
      align-items: center;
      padding: 0 10px;
      margin-top: 100px;
    }

    .rules-section {
      width: 100%;
      display: flex;
      justify-content: right;
      align-items: center;
      padding: 20px 10px;
      margin-top: 30px;
    }
  }
}

.rules-popup {
  padding: 20px;
  background-color: #fff;
  border-radius: 12px;
}

.rules-header {
  margin-bottom: 20px;
  text-align: center;
}

.rules-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.rules-content {
  max-height: 60vh;
  overflow-y: auto;
}

.rule-item {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

.rule-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.rule-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}

.settings-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  transition: background-color 0.3s;

  &.dark-theme {
    background-color: #1a1a1a;
    color: #fff;
  }
}

.settings-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  .settings-title {
    font-size: 20px;
    font-weight: bold;
    color: #333;
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
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

// 暗黑模式样式
.dark-theme {
  .settings-header {
    border-bottom-color: #444;

    .settings-title {
      color: #fff;
    }
  }

  .settings-section {
    background-color: #2a2a2a;
    color: #fff;
  }

  .section-title {
    color: #fff;
    border-bottom-color: #444;
  }

  .stats-card {
    background-color: #2a2a2a;
    border-color: #444;
    color: #fff;
  }

  .stats-header {
    border-bottom-color: #444;
  }

  .stats-title {
    color: #fff;
  }

  .stats-label {
    color: #ccc;
  }

  .stats-value {
    color: #fff;
  }

  .stats-empty {
    color: #888;
  }
}
</style>
