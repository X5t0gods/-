<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 会员档案 -->
        <el-tab-pane label="会员档案" name="list">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="手机号 / 会员卡号" clearable style="width: 240px" />
            <el-select v-model="level" placeholder="全部等级" clearable style="width: 150px">
              <el-option label="普通" value="normal" />
              <el-option label="白银" value="silver" />
              <el-option label="黄金" value="gold" />
              <el-option label="铂金" value="platinum" />
            </el-select>
            <el-select v-model="status" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="正常" value="normal" />
              <el-option label="待激活" value="pending" />
              <el-option label="已停用" value="disabled" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="会员列表"
            :subtitle="`共 ${filtered.length} 条`"
            :columns="memberColumns"
            :rows="pagedWithMask"
            :total="filtered.length"
            :page="page"
            @update:page="(p: number) => (page = p)"
          >
            <template #actions>
              <el-button plain @click="activeTab = 'balance'">批量发券</el-button>
              <el-button type="primary" :icon="Plus" @click="onAddMember">新增会员</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 储值管理 -->
        <el-tab-pane label="储值管理" name="balance">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="储值余额分为「本金余额」与「赠送余额」：消费时优先扣减赠送余额；赠送金额不可退款，充值退款须店长授权。"
            class="alert-gap"
          />
          <DataPanel
            title="会员资金流水"
            subtitle="仅追加不修改，任意时点余额可还原核对"
            :columns="balanceColumns"
            :rows="balanceFlows as unknown as Record<string, string | number>[]"
            :total="balanceFlows.length"
            :page="1"
          >
            <template #actions>
              <el-button type="primary" @click="openRecharge">会员充值</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 积分管理 -->
        <el-tab-pane label="积分管理" name="point">
          <DataPanel
            title="积分流水"
            subtitle="消费自动累积；退货按比例扣回；手工调整须填写原因"
            :columns="pointColumns"
            :rows="pointFlows as unknown as Record<string, string | number>[]"
            :total="pointFlows.length"
            :page="1"
          />
        </el-tab-pane>

        <!-- 会员消费分析 -->
        <el-tab-pane label="会员消费分析" name="analysis">
          <el-row :gutter="16">
            <el-col :xs="24" :lg="10">
              <section class="panel">
                <div class="panel-head">
                  <div class="panel-title">会员等级分布</div>
                </div>
                <ChartCard :option="levelOption" :height="260" />
              </section>
            </el-col>
            <el-col :xs="24" :lg="14">
              <DataPanel
                title="会员消费排行"
                subtitle="按累计消费金额排序"
                show-index
                :columns="rankColumns"
                :rows="memberRank as unknown as Record<string, string | number>[]"
                :show-pagination="false"
                :show-export="false"
              />
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 会员等级管理 -->
        <el-tab-pane label="会员等级" name="level">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="会员等级根据累计消费金额自动升降，等级越高享受的折扣和积分倍率越优惠。"
            class="alert-gap"
          />
          <DataPanel
            title="会员等级规则"
            subtitle="系统预置 4 个等级，可按需调整升级条件与权益"
            :columns="levelColumns"
            :rows="levelRules as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" @click="msg('等级规则已保存')">保存设置</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- 会员充值 -->
    <el-dialog v-model="rechargeVisible" title="会员充值" width="480px">
      <el-form :model="rechargeForm" label-width="92px">
        <el-form-item label="会员">
          <el-input v-model="rechargeForm.member" placeholder="输入手机号或会员卡号" />
        </el-form-item>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amount" :min="0" :precision="2" :step="50" style="width: 100%" />
        </el-form-item>
        <el-form-item label="赠送金额">
          <el-input-number v-model="rechargeForm.gift" :min="0" :precision="2" :step="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-radio-group v-model="rechargeForm.method">
            <el-radio value="cash">现金</el-radio>
            <el-radio value="wechat">微信</el-radio>
            <el-radio value="alipay">支付宝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecharge">确认充值</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { EChartsOption } from 'echarts'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import ChartCard from '@/components/ChartCard.vue'
import type { StatItem, TableColumn } from '@/types'
import {
  BALANCE_TYPE_TEXT,
  MEMBER_LEVEL_TEXT,
  balanceFlowList,
  memberList,
  memberStats,
  pointFlowList,
} from '@/utils/mock'
import { formatMoney, maskPhone } from '@/utils/format'

const activeTab = ref('list')
const keyword = ref('')
const level = ref('')
const status = ref('')
const page = ref(1)

/** 会员指标由数据集推导，且与下方「等级分布」饼图同源 */
const mStats = memberStats()

const stats: StatItem[] = [
  { label: '会员总数', value: mStats.total, delta: '实时统计', deltaType: 'up' },
  { label: '待激活会员', value: mStats.newCount, delta: '需引导首次消费', deltaType: 'down' },
  { label: '储值余额合计', value: `¥${formatMoney(mStats.balance)}`, delta: '含赠送余额', deltaType: 'up' },
  { label: '活跃会员', value: mStats.active, delta: '近 30 天有消费', deltaType: 'up' },
]

const members = memberList()

const filtered = computed(() =>
  members.filter((m) => {
    if (keyword.value && !m.phone.includes(keyword.value) && !m.cardNo.includes(keyword.value)) return false
    if (level.value && m.level !== level.value) return false
    if (status.value && m.status !== status.value) return false
    return true
  }),
)

const paged = computed(() => filtered.value.slice((page.value - 1) * 20, page.value * 20))

const memberColumns: TableColumn[] = [
  { prop: 'cardNo', label: '会员卡号', width: 140 },
  { prop: 'name', label: '姓名', width: 100 },
  { prop: 'phoneMasked', label: '手机号', width: 140 },
  {
    prop: 'level',
    label: '会员等级',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      normal: { text: '普通', type: 'info' },
      silver: { text: '白银', type: 'primary' },
      gold: { text: '黄金', type: 'warning' },
      platinum: { text: '铂金', type: 'danger' },
    },
  },
  { prop: 'balance', label: '储值余额', width: 120, align: 'right', render: 'money' },
  { prop: 'points', label: '积分', width: 100, align: 'right', render: 'num' },
  { prop: 'totalConsume', label: '累计消费', width: 130, align: 'right', render: 'money' },
  { prop: 'consumeCount', label: '消费次数', width: 110, align: 'right', render: 'num' },
  { prop: 'lastConsumeAt', label: '最近消费', width: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      normal: { text: '正常', type: 'success' },
      pending: { text: '待激活', type: 'warning' },
      disabled: { text: '已停用', type: 'info' },
    },
  },
]

// 手机号脱敏后展示（数据层仍保留完整号码）
const pagedWithMask = computed(() =>
  paged.value.map((m) => ({ ...m, phoneMasked: maskPhone(m.phone) })) as unknown as Record<string, string | number>[],
)

function resetQuery(): void {
  keyword.value = ''
  level.value = ''
  status.value = ''
  page.value = 1
}

function onAddMember(): void {
  ElMessageBox.prompt('请输入会员手机号（仅手机号即可完成快速注册）', '新增会员', {
    confirmButtonText: '注册',
    cancelButtonText: '取消',
    inputPattern: /^1[3-9]\d{9}$/,
    inputErrorMessage: '请输入正确的手机号',
  })
    .then(() => ElMessage.success('会员注册成功'))
    .catch(() => undefined)
}

/* ---------------- 储值 ---------------- */
const balanceFlows = balanceFlowList(40)

const balanceColumns: TableColumn[] = [
  { prop: 'memberName', label: '会员', width: 100 },
  { prop: 'cardNo', label: '会员卡号', width: 140 },
  {
    prop: 'changeType',
    label: '变动类型',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      recharge: { text: '充值', type: 'success' },
      consume: { text: '消费', type: 'primary' },
      refund: { text: '退款', type: 'warning' },
      adjust: { text: '调整', type: 'info' },
      gift: { text: '赠送', type: 'danger' },
    },
  },
  { prop: 'amount', label: '本金变动', width: 120, align: 'right', render: 'money' },
  { prop: 'giftAmount', label: '赠送金额', width: 120, align: 'right', render: 'money' },
  { prop: 'afterBalance', label: '变动后余额', width: 130, align: 'right', render: 'money' },
  { prop: 'operator', label: '操作人', width: 100 },
  { prop: 'createdAt', label: '变动时间', width: 180 },
]

const rechargeVisible = ref(false)
const rechargeForm = reactive({ member: '', amount: 100, gift: 10, method: 'wechat' })

function openRecharge(): void {
  rechargeVisible.value = true
}

function submitRecharge(): void {
  if (!rechargeForm.member) {
    ElMessage.warning('请输入会员手机号或卡号')
    return
  }
  rechargeVisible.value = false
  ElMessage.success(`充值成功：本金 ¥${formatMoney(rechargeForm.amount)}，赠送 ¥${formatMoney(rechargeForm.gift)}`)
}

/* ---------------- 积分 ---------------- */
const pointFlows = pointFlowList(40)

const pointColumns: TableColumn[] = [
  { prop: 'memberName', label: '会员', width: 100 },
  { prop: 'cardNo', label: '会员卡号', width: 140 },
  {
    prop: 'changeType',
    label: '变动类型',
    width: 120,
    align: 'center',
    render: 'tag',
    tagMap: {
      gain: { text: '消费获得', type: 'success' },
      refund_deduct: { text: '退货扣回', type: 'danger' },
      exchange: { text: '积分兑换', type: 'primary' },
      adjust: { text: '手工调整', type: 'warning' },
      expire: { text: '过期清零', type: 'info' },
    },
  },
  { prop: 'points', label: '积分变动', width: 110, align: 'right' },
  { prop: 'afterPoints', label: '变动后积分', width: 120, align: 'right', render: 'num' },
  { prop: 'refNo', label: '来源单号', width: 190 },
  { prop: 'operator', label: '操作人', width: 100 },
  { prop: 'createdAt', label: '变动时间', width: 180 },
]

void BALANCE_TYPE_TEXT
void MEMBER_LEVEL_TEXT

/* ---------------- 消费分析 ---------------- */
const memberRank = computed(() =>
  [...members].sort((a, b) => b.totalConsume - a.totalConsume).slice(0, 10),
)

const rankColumns: TableColumn[] = [
  { prop: 'name', label: '会员', width: 100 },
  { prop: 'cardNo', label: '会员卡号', width: 140 },
  {
    prop: 'level',
    label: '等级',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      normal: { text: '普通', type: 'info' },
      silver: { text: '白银', type: 'primary' },
      gold: { text: '黄金', type: 'warning' },
      platinum: { text: '铂金', type: 'danger' },
    },
  },
  { prop: 'consumeCount', label: '消费次数', width: 110, align: 'right', render: 'num' },
  { prop: 'totalConsume', label: '累计消费', width: 140, align: 'right', render: 'money' },
]

const levelOption = computed<EChartsOption>(() => {
  const lc = mStats.levelCount
  const data = [
    { name: '普通', value: lc.normal ?? 0 },
    { name: '白银', value: lc.silver ?? 0 },
    { name: '黄金', value: lc.gold ?? 0 },
    { name: '铂金', value: lc.platinum ?? 0 },
  ]
  return {
    tooltip: { trigger: 'item', formatter: '{b}：{c} 人（{d}%）' },
    legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 12, color: '#5c6673' } },
    series: [
      {
        type: 'pie',
        radius: ['46%', '68%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#5c6673' },
        data,
        color: ['#a9c4ee', '#4a7fe0', '#1565c0', '#0b3d80'],
      },
    ],
  }
})

/* ---------------- 会员等级规则 ---------------- */
const levelRules = [
  { code: 'normal', name: '普通', upgradeAmount: 0, discountRate: 1.0, pointRate: 1.0, description: '默认等级，无额外折扣' },
  { code: 'silver', name: '白银', upgradeAmount: 1000, discountRate: 0.98, pointRate: 1.2, description: '累计消费满 1000 元升级' },
  { code: 'gold', name: '黄金', upgradeAmount: 3000, discountRate: 0.95, pointRate: 1.5, description: '累计消费满 3000 元升级' },
  { code: 'platinum', name: '铂金', upgradeAmount: 8000, discountRate: 0.90, pointRate: 2.0, description: '累计消费满 8000 元升级' },
]

const levelColumns: TableColumn[] = [
  { prop: 'name', label: '等级名称', width: 100, align: 'center' },
  { prop: 'upgradeAmount', label: '升级条件（元）', width: 140, align: 'right' },
  { prop: 'discountRate', label: '折扣率', width: 100, align: 'center' },
  { prop: 'pointRate', label: '积分倍率', width: 100, align: 'center' },
  { prop: 'description', label: '等级说明', minWidth: 200 },
]

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
</style>
