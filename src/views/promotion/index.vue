<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 活动列表 -->
        <el-tab-pane label="活动列表" name="list">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="活动名称" clearable style="width: 240px" />
            <el-select v-model="promoType" placeholder="全部类型" clearable style="width: 160px">
              <el-option label="满减" value="full_reduce" />
              <el-option label="折扣" value="discount" />
              <el-option label="特价" value="special" />
              <el-option label="第二件半价" value="second_half" />
              <el-option label="买赠" value="gift" />
            </el-select>
            <el-select v-model="status" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="进行中" value="running" />
              <el-option label="待生效" value="pending" />
              <el-option label="已结束" value="ended" />
              <el-option label="已停用" value="stopped" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="促销活动列表"
            :subtitle="`共 ${filtered.length} 个活动`"
            :columns="activityColumns"
            :rows="filteredWithRange"
            :show-pagination="false"
          >
            <template #actions>
              <el-button plain @click="msg('已批量停用选中活动（演示）')">批量启停</el-button>
              <el-button type="primary" :icon="Plus" @click="activeTab = 'create'">新建活动</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 新建活动 -->
        <el-tab-pane label="新建活动" name="create">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="同一商品命中多个活动时：不可叠加的按优先级取一，可叠加的按优先级由高到低依次计算；收银时系统自动匹配生效活动。"
            class="alert-gap"
          />
          <el-form :model="activityForm" label-width="120px" class="activity-form">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="活动名称" required>
                  <el-input v-model="activityForm.name" placeholder="如：中秋满减专场" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="活动类型" required>
                  <el-select v-model="activityForm.promoType" style="width: 100%">
                    <el-option label="满减（满 X 元减 Y 元）" value="full_reduce" />
                    <el-option label="整单折扣" value="discount" />
                    <el-option label="单品特价" value="special" />
                    <el-option label="第二件半价" value="second_half" />
                    <el-option label="买赠" value="gift" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="生效时间" required>
                  <el-date-picker
                    v-model="activityForm.range"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    value-format="YYYY-MM-DD HH:mm"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="参与范围" required>
                  <el-radio-group v-model="activityForm.scope">
                    <el-radio value="all">全部商品</el-radio>
                    <el-radio value="category">指定分类</el-radio>
                    <el-radio value="product">指定商品</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>

              <template v-if="activityForm.promoType === 'full_reduce'">
                <el-col :span="12">
                  <el-form-item label="满减门槛">
                    <el-input-number v-model="activityForm.threshold" :min="0" :precision="2" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="减免金额">
                    <el-input-number v-model="activityForm.reduce" :min="0" :precision="2" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </template>

              <template v-if="activityForm.promoType === 'discount'">
                <el-col :span="12">
                  <el-form-item label="折扣率">
                    <el-input-number v-model="activityForm.rate" :min="0.1" :max="1" :step="0.05" :precision="2" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </template>

              <template v-if="activityForm.promoType === 'special'">
                <el-col :span="12">
                  <el-form-item label="特价单价">
                    <el-input-number v-model="activityForm.specialPrice" :min="0" :precision="2" style="width: 100%" />
                  </el-form-item>
                </el-col>
              </template>

              <el-col :span="12">
                <el-form-item label="优先级">
                  <el-input-number v-model="activityForm.priority" :min="1" :max="999" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="是否可叠加">
                  <el-switch v-model="activityForm.stackable" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="活动说明">
                  <el-input v-model="activityForm.remark" type="textarea" :rows="2" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item>
              <el-button @click="onResetActivity">重置</el-button>
              <el-button type="primary" @click="onSaveActivity">保存并启用</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 促销效果 -->
        <el-tab-pane label="促销效果" name="effect">
          <section class="panel">
            <div class="panel-head">
              <div class="panel-title">活动效果对比
                <small>对比口径：活动期间 vs 活动前同等天数</small>
              </div>
              <el-select v-model="effectActivity" style="width: 220px">
                <el-option v-for="a in activities" :key="a.id" :label="a.name" :value="a.name" />
              </el-select>
            </div>
            <ChartCard :option="effectOption" :height="300" />
          </section>
        </el-tab-pane>

        <!-- 优惠券 -->
        <el-tab-pane label="优惠券" name="coupon">
          <DataPanel
            title="优惠券模板"
            subtitle="支持现金券与折扣券，可按固定日期或领取后 N 天设置有效期"
            :columns="couponColumns"
            :rows="couponsWithFace"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" :icon="Plus" @click="msg('打开新建优惠券表单（演示）')">新建优惠券</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import ChartCard from '@/components/ChartCard.vue'
import type { StatItem, TableColumn } from '@/types'
import { PROMO_TYPE_TEXT, activityList, activityStats, couponList } from '@/utils/mock'

const activeTab = ref('list')
const keyword = ref('')
const promoType = ref('')
const status = ref('')

const activities = activityList()
const aStats = activityStats()

const stats: StatItem[] = [
  { label: '进行中活动', value: aStats.running, delta: `共 ${aStats.total} 个活动`, deltaType: 'up' },
  { label: '待生效活动', value: aStats.pending, delta: '到达生效时间自动开始', deltaType: 'up' },
  { label: '已结束活动', value: aStats.ended, delta: `已停用 ${aStats.stopped} 个`, deltaType: 'down' },
  {
    label: '可用优惠券',
    value: couponList().filter((c) => c.status === 'on').length,
    delta: `共 ${couponList().length} 个券模板`,
    deltaType: 'up',
  },
]

const filtered = computed(() =>
  activities.filter((a) => {
    if (keyword.value && !a.name.includes(keyword.value)) return false
    if (promoType.value && a.promoType !== promoType.value) return false
    if (status.value && a.status !== status.value) return false
    return true
  }),
)

const activityColumns: TableColumn[] = [
  { prop: 'name', label: '活动名称', minWidth: 180 },
  {
    prop: 'promoType',
    label: '活动类型',
    width: 120,
    align: 'center',
    render: 'tag',
    tagMap: {
      full_reduce: { text: '满减', type: 'danger' },
      discount: { text: '折扣', type: 'warning' },
      special: { text: '特价', type: 'primary' },
      second_half: { text: '第二件半价', type: 'success' },
      gift: { text: '买赠', type: 'info' },
    },
  },
  { prop: 'ruleText', label: '优惠规则', minWidth: 170 },
  { prop: 'scopeText', label: '适用范围', minWidth: 140 },
  { prop: 'dateRange', label: '有效期', width: 190 },
  {
    prop: 'status',
    label: '活动状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      running: { text: '进行中', type: 'success' },
      pending: { text: '待生效', type: 'primary' },
      ended: { text: '已结束', type: 'info' },
      stopped: { text: '已停用', type: 'info' },
    },
  },
]

// 有效期合并展示
const filteredWithRange = computed(() =>
  filtered.value.map((a) => ({
    ...a,
    dateRange: `${a.startDate.slice(5)} ~ ${a.endDate.slice(5)}`,
  })) as unknown as Record<string, string | number>[],
)

function resetQuery(): void {
  keyword.value = ''
  promoType.value = ''
  status.value = ''
}

/* ---------------- 新建活动 ---------------- */
const activityForm = reactive({
  name: '',
  promoType: 'full_reduce',
  range: [] as string[],
  scope: 'all',
  threshold: 100,
  reduce: 10,
  rate: 0.85,
  specialPrice: 0,
  priority: 100,
  stackable: false,
  remark: '',
})

function onResetActivity(): void {
  Object.assign(activityForm, {
    name: '',
    promoType: 'full_reduce',
    range: [],
    scope: 'all',
    threshold: 100,
    reduce: 10,
    rate: 0.85,
    specialPrice: 0,
    priority: 100,
    stackable: false,
    remark: '',
  })
}

function onSaveActivity(): void {
  if (!activityForm.name || activityForm.range.length !== 2) {
    ElMessage.warning('请填写活动名称与生效时间')
    return
  }
  if (new Date(activityForm.range[0]!) >= new Date(activityForm.range[1]!)) {
    ElMessage.error('结束时间必须晚于开始时间')
    return
  }
  ElMessage.success(`活动「${activityForm.name}」已保存并启用`)
  onResetActivity()
  activeTab.value = 'list'
}

/* ---------------- 效果 ---------------- */
const effectActivity = ref(activities[0]?.name ?? '')

/** 切换活动时重新计算前后销量对比，避免图表与所选活动无关 */
const effectData = computed(() => {
  const idx = Math.max(0, activities.findIndex((a) => a.name === effectActivity.value))
  const before = [42, 36, 18, 40, 12].map((v, i) => Math.max(4, v + ((idx * 7 + i * 3) % 11) - 5))
  const boost = [1.62, 1.69, 1.89, 1.38, 2.17][idx % 5]!
  return { before, after: before.map((v) => Math.round(v * boost)) }
})

const effectOption = computed<EChartsOption>(() => ({
  grid: { left: 8, right: 20, top: 40, bottom: 8, containLabel: true },
  tooltip: { trigger: 'axis' },
  legend: { top: 4, icon: 'roundRect', textStyle: { fontSize: 12, color: '#5c6673' } },
  xAxis: {
    type: 'category',
    data: ['伊利纯牛奶', '乐事薯片', '五常大米', '康师傅方便面', '蓝月亮洗衣液'],
    axisLine: { lineStyle: { color: '#e3e8ef' } },
    axisTick: { show: false },
    axisLabel: { color: '#5c6673', fontSize: 11 },
  },
  yAxis: {
    type: 'value',
    name: '件 / 日',
    nameTextStyle: { color: '#98a1ad', fontSize: 11 },
    splitLine: { lineStyle: { color: '#f0f2f5' } },
    axisLabel: { color: '#98a1ad', fontSize: 11 },
  },
  series: [
    {
      name: '活动前日均销量',
      type: 'bar',
      data: effectData.value.before,
      barWidth: '28%',
      itemStyle: { color: '#a9c4ee', borderRadius: [4, 4, 0, 0] },
    },
    {
      name: '活动期间日均销量',
      type: 'bar',
      data: effectData.value.after,
      barWidth: '28%',
      itemStyle: { color: '#1565c0', borderRadius: [4, 4, 0, 0] },
    },
  ],
}))

/* ---------------- 优惠券 ---------------- */
const coupons = couponList()

const couponColumns: TableColumn[] = [
  { prop: 'name', label: '优惠券名称', minWidth: 160 },
  {
    prop: 'couponType',
    label: '类型',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      cash: { text: '现金券', type: 'danger' },
      discount: { text: '折扣券', type: 'warning' },
    },
  },
  { prop: 'faceText', label: '面额 / 折扣', width: 120, align: 'right' },
  { prop: 'minAmount', label: '使用门槛', width: 120, align: 'right', render: 'money' },
  { prop: 'validType', label: '有效期类型', width: 130 },
  { prop: 'validRange', label: '有效区间', minWidth: 180 },
  { prop: 'totalQty', label: '发行总量', width: 110, align: 'right', render: 'num' },
  { prop: 'issuedQty', label: '已发放', width: 100, align: 'right', render: 'num' },
  { prop: 'usedQty', label: '已使用', width: 100, align: 'right', render: 'num' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      on: { text: '启用', type: 'success' },
      off: { text: '停用', type: 'info' },
    },
  },
]

const couponsWithFace = computed(() =>
  coupons.map((c) => ({
    ...c,
    faceText: c.couponType === 'cash' ? `¥${c.faceValue.toFixed(2)}` : `${(c.faceValue * 10).toFixed(1)} 折`,
    totalQty: c.totalQty === 0 ? '不限' : c.totalQty,
  })) as unknown as Record<string, string | number>[],
)

void PROMO_TYPE_TEXT

function msg(text: string): void {
  ElMessage.success(text)
}
</script>

<style scoped>
.filter-bar--inner {
  padding: 0;
  margin-bottom: 14px;
  background: transparent;
}

.alert-gap {
  margin-bottom: 14px;
}

.activity-form {
  max-width: 1000px;
}
</style>
