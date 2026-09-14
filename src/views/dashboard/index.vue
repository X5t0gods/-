<template>
  <div>
    <!-- 顶部筛选 -->
    <div class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="~"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 268px"
      />
      <el-select v-model="compare" style="width: 150px">
        <el-option label="对比上一周期" value="prev" />
        <el-option label="不对比" value="none" />
      </el-select>
      <div class="spacer"></div>
      <el-button :icon="Download" plain @click="onExport">导出报表</el-button>
      <el-button type="primary" :icon="Refresh" @click="onRefresh">刷新数据</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <!-- 趋势 + 排行 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">近 7 日销售额趋势</div>
            <span class="legend-dot"><i></i> 销售额（元）</span>
          </div>
          <ChartCard :option="trendOption" :height="272" />
        </section>
      </el-col>
      <el-col :xs="24" :lg="8">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">热销商品 Top 5</div>
            <router-link v-if="canAccessReport" to="/report" class="more-link">查看全部</router-link>
          </div>
          <ul class="rank-list">
            <li v-for="(p, i) in topProducts" :key="p.name">
              <span class="rank-index" :class="{ 'is-top': i < 3 }">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="rank-name">{{ p.name }}</span>
              <span class="rank-value num">{{ formatInt(p.qty) }} 件</span>
            </li>
          </ul>
        </section>
      </el-col>
    </el-row>

    <!-- 预警清单 + 品类占比 -->
    <el-row :gutter="16" class="mt-16">
      <el-col :xs="24" :lg="14">
        <section class="panel panel--flat">
          <div class="panel-head panel-head--inset">
            <div class="panel-title">
              库存预警清单
              <el-tag type="warning" size="small" effect="light">{{ alertRows.length }} 项待处理</el-tag>
            </div>
            <router-link v-if="canAccessInventory" to="/inventory" class="more-link">去补货</router-link>
          </div>
          <el-table :data="alertRows" stripe border>
            <el-table-column prop="name" label="商品" min-width="240" show-overflow-tooltip />
            <el-table-column prop="stock" label="当前库存" width="120" align="right">
              <template #default="{ row }">
                <span class="num" :class="row.stock === 0 ? 'text-danger' : 'text-warning'">{{ row.stock }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="row.stock === 0 ? 'danger' : 'warning'" size="small" effect="light">
                  {{ row.stock === 0 ? '缺货' : '低库存' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </el-col>
      <el-col :xs="24" :lg="10">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">品类销售占比</div>
          </div>
          <ul class="share-list">
            <li v-for="c in categoryShare" :key="c.name">
              <span class="share-name">{{ c.name }}</span>
              <span class="share-bar">
                <i :style="{ width: `${c.ratio * 2.6}%` }"></i>
              </span>
              <span class="share-amount num">¥{{ formatMoney(c.amount) }}</span>
              <span class="share-ratio num">{{ c.ratio }}%</span>
            </li>
          </ul>
        </section>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import StatCard from '@/components/StatCard.vue'
import ChartCard from '@/components/ChartCard.vue'
import type { StatItem } from '@/types'
import {
  categoryShare as getCategoryShare,
  dailyTrend,
  productList,
  productStats,
  slowMovingProducts,
  topProducts as getTopProducts,
  tradeStats,
} from '@/utils/mock'
import { formatInt, formatMoney, formatDate, dayOffset } from '@/utils/format'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 根据角色判断是否有权限访问报表和库存页面
const canAccessReport = computed(() => userStore.hasRole('店主', '系统管理员', '库管员', '采购员'))
const canAccessInventory = computed(() => userStore.hasRole('店主', '库管员', '采购员'))

const compare = ref('prev')
const dateRange = ref<[string, string]>([formatDate(dayOffset(-13)), formatDate(new Date())])

const topProducts = getTopProducts(5)
const categoryShare = getCategoryShare()

// 指标由数据集实时推导，保证卡片数字与下方列表一致
const trade = tradeStats()
const pStats = productStats()

const stats: StatItem[] = [
  { label: '今日销售额', value: trade.amount, delta: `昨日 ¥${formatMoney(10420)}`, deltaType: 'up' },
  { label: '今日交易笔数', value: trade.count, delta: `挂单中 ${trade.holding} 笔`, deltaType: 'up' },
  { label: '今日客单价', value: trade.unitPrice, delta: '较昨日 -2.4%', deltaType: 'down' },
  { label: '库存预警商品', value: pStats.alert, delta: `其中缺货 ${pStats.out} 项`, deltaType: 'up' },
]

/** 从商品全量数据中筛出低库存 / 缺货商品作为预警清单（不截断，与卡片数字一致） */
const alertRows = computed(() =>
  productList()
    .filter((p) => p.status === 'low' || p.status === 'out')
    .map((p) => ({ id: p.id, name: p.name, stock: p.stock, safeStock: p.safeStock })),
)

const trend = dailyTrend(7)

const trendOption = computed<EChartsOption>(() => ({
  grid: { left: 8, right: 16, top: 24, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => `¥${formatMoney(Number(v))}` },
  xAxis: {
    type: 'category',
    data: trend.map((t) => t.label),
    axisLine: { lineStyle: { color: '#e3e8ef' } },
    axisTick: { show: false },
    axisLabel: { color: '#5c6673', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f2f5' } },
    axisLabel: {
      color: '#98a1ad',
      fontSize: 11,
      formatter: (v: number) => `${v / 1000}k`,
    },
  },
  series: [
    {
      type: 'bar',
      data: trend.map((t) => t.value),
      barWidth: '46%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: (params: { dataIndex: number }) =>
          params.dataIndex === trend.length - 1 ? '#1565c0' : '#a9c4ee',
      },
    },
  ],
}))

function onExport(): void {
  ElMessage.success('已生成看板报表（演示模式，未真实下载）')
}

function onRefresh(): void {
  ElMessage.success('数据已刷新')
}

// 保留引用，避免未使用告警
void slowMovingProducts
</script>

<style scoped>
.legend-dot {
  font-size: 12px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot i {
  width: 9px;
  height: 9px;
  border-radius: 2px;
  background: var(--brand-7);
  display: inline-block;
}

.more-link {
  font-size: 12.5px;
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--border-color);
}

.rank-list li:last-child {
  border-bottom: none;
}

.rank-index {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-placeholder);
  flex: 0 0 22px;
}

.rank-index.is-top {
  color: var(--brand-7);
}

.rank-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-value {
  font-size: 12.5px;
  color: var(--text-secondary);
  flex: 0 0 auto;
}

.share-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.share-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}

.share-name {
  flex: 0 0 46px;
  font-size: 13px;
  color: var(--text-primary);
}

.share-bar {
  flex: 1;
  height: 8px;
  background: var(--gray-1);
  border-radius: 4px;
  overflow: hidden;
}

.share-bar i {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #4a7fe0, #1565c0);
}

.share-amount {
  flex: 0 0 84px;
  text-align: right;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.share-ratio {
  flex: 0 0 46px;
  text-align: right;
  font-size: 12.5px;
  color: var(--text-primary);
}
</style>
