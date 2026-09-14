<template>
  <div>
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
      <el-radio-group v-model="dimension">
        <el-radio-button value="day">按日</el-radio-button>
        <el-radio-button value="week">按周</el-radio-button>
        <el-radio-button value="month">按月</el-radio-button>
      </el-radio-group>
      <div class="spacer"></div>
      <el-button :icon="Download" plain @click="msg('已生成 Excel 报表（演示模式，未真实下载）')">导出报表</el-button>
      <el-button type="primary" :icon="Refresh" @click="msg('数据已刷新')">刷新数据</el-button>
    </div>

    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="16">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">本月销售额走势</div>
            <span class="legend-dot"><i></i> 销售额（元）</span>
          </div>
          <ChartCard :option="trendOption" :height="286" />
        </section>
      </el-col>
      <el-col :xs="24" :lg="8">
        <section class="panel">
          <div class="panel-head">
            <div class="panel-title">商品销售排行 Top 5</div>
          </div>
          <ul class="rank-list">
            <li v-for="(p, i) in top5" :key="p.name">
              <span class="rank-index" :class="{ 'is-top': i < 3 }">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="rank-name">{{ p.name }}</span>
              <span class="rank-value num">{{ formatInt(p.qty) }} 件</span>
            </li>
          </ul>
        </section>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :xs="24" :lg="14">
        <section class="panel panel--flat">
          <div class="panel-head panel-head--inset">
            <div class="panel-title">
              滞销商品清单
              <el-tag type="warning" size="small" effect="light">30 日销量低于 10 件</el-tag>
            </div>
            <el-button plain size="small" @click="msg('已导出滞销商品清单')">导出</el-button>
          </div>
          <el-table :data="slowRows" stripe border>
            <el-table-column prop="name" label="商品" min-width="240" show-overflow-tooltip />
            <el-table-column prop="sales" label="30 日销量" width="120" align="right" />
            <el-table-column label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="row.sales === 0 ? 'danger' : 'warning'" size="small" effect="light">
                  {{ row.sales === 0 ? '零销售' : '滞销' }}
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
              <span class="share-bar"><i :style="{ width: `${c.ratio * 2.6}%` }"></i></span>
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
  productStats,
  slowMovingProducts,
  topProducts,
} from '@/utils/mock'
import { dayOffset, formatDate, formatInt, formatMoney } from '@/utils/format'

const compare = ref('prev')
const dimension = ref('day')
const dateRange = ref<[string, string]>([formatDate(dayOffset(-29)), formatDate(new Date())])

const top5 = topProducts(5)
const categoryShare = getCategoryShare()
const slowRows = slowMovingProducts(4)

/** 报表口径为近 30 天：卡片数字由趋势数据求和推导，保证与图表同源 */
const trend = dailyTrend(30)
const monthAmount = trend.reduce((s, t) => s + t.value, 0)
const monthCount = trend.reduce((s, t) => s + t.count, 0)
const monthUnit = monthCount ? monthAmount / monthCount : 0
const grossRate = productStats().avgGrossRate

const stats: StatItem[] = [
  { label: '本月销售额', value: `¥${formatMoney(monthAmount)}`, delta: '近 30 天累计', deltaType: 'up' },
  { label: '本月交易笔数', value: formatInt(monthCount), delta: '近 30 天累计', deltaType: 'up' },
  { label: '本月客单价', value: `¥${formatMoney(monthUnit)}`, delta: '销售额 ÷ 交易笔数', deltaType: 'down' },
  { label: '综合毛利率', value: `${(grossRate * 100).toFixed(1)}%`, delta: '按商品定价测算', deltaType: 'down' },
]

const trendOption = computed<EChartsOption>(() => ({
  grid: { left: 8, right: 16, top: 24, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => `¥${formatMoney(Number(v))}` },
  xAxis: {
    type: 'category',
    data: trend.map((t) => t.label),
    axisLine: { lineStyle: { color: '#e3e8ef' } },
    axisTick: { show: false },
    axisLabel: { color: '#5c6673', fontSize: 10, interval: 4 },
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f2f5' } },
    axisLabel: { color: '#98a1ad', fontSize: 11, formatter: (v: number) => `${v / 1000}k` },
  },
  series: [
    {
      type: 'bar',
      data: trend.map((t) => t.value),
      barWidth: '44%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: (params: { dataIndex: number }) => (params.dataIndex === trend.length - 1 ? '#1565c0' : '#a9c4ee'),
      },
    },
  ],
}))

function msg(text: string): void {
  ElMessage.success(text)
}
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-value {
  font-size: 12.5px;
  color: var(--text-secondary);
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
}
</style>
