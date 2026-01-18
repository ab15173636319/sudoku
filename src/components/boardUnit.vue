<template>
  <view class="board">
    <view class="item" v-for="index in 9" :key="index">
      <baseUnit color="gold" :unitKey="keyStr + '-' + index">{{
        index
      }}</baseUnit>
    </view>
  </view>
</template>

<script lang="ts">
import baseUnit from "./baseUnit.vue";

export default {
  props: {
    _key: {
      type: Number,
    },
  },
  components: {
    baseUnit,
  },
  data() {
    return {
      keyStr: "",
    };
  },
  created() {
    this.keyStr = this._key.toString();
    console.log(this._key);
  },
};
</script>

<style scoped>
.board {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;

  .item {
    aspect-ratio: 1/1;
  }
}
</style>
