<template>
  <div class="stat-card">
    <div class="stat-main">
      <div class="stat-label">{{ item.label }}</div>
      <div class="stat-value num">
        <span class="value-text">{{ displayValue }}</span>
        <span v-if="unit" class="value-unit">{{ unit }}</span>
      </div>
      <div v-if="item.delta" class="stat-delta" :class="`is-${item.deltaType || 'up'}`">
        {{ item.delta }}
      </div>
    </div>
    <div class="stat-corner" :class="`is-${item.deltaType || 'up'}`">
      <el-icon :size="13">
        <Top v-if="item.deltaType !== 'down'" />
        <Bottom v-else />
      </el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { StatItem } from '@/types'

const props = defineProps<{
  item: StatItem
  unit?: string
}>()

/** 数值部分自动千分位；整数不补小数位，小数保留两位；字符串（含货币符号或百分比）原样展示 */
const displayValue = computed(() => {
  const v = props.item.value
  if (typeof v === 'number') {
    const digits = Number.isInteger(v) ? 0 : 2
    return v.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  }
  return v
})
</script>

<style scoped>
.stat-card {
  position: relative;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 106px;
  transition: box-shadow 0.18s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(21, 101, 192, 0.1);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--text-primary);
}

.value-text {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.4px;
}

.value-unit {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-delta {
  margin-top: 8px;
  font-size: 12px;
}

.stat-delta.is-up {
  color: var(--color-warning);
}

.stat-delta.is-down {
  color: var(--color-success);
}

.stat-corner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 26px;
}

.stat-corner.is-up {
  background: var(--brand-1);
  color: var(--brand-7);
}

.stat-corner.is-down {
  background: var(--color-success-light);
  color: var(--color-success);
}
</style>
