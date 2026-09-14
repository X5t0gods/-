<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 交易查询 -->
        <el-tab-pane label="交易查询" name="trade">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="交易号 / 小票号" clearable style="width: 240px" />
            <el-select v-model="cashier" placeholder="全部收银员" clearable style="width: 150px">
              <el-option v-for="c in ['李小美', '陈小丽', '徐店长']" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="status" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="已完成" value="normal" />
              <el-option label="已退货" value="returned" />
              <el-option label="部分退货" value="partly_returned" />
              <el-option label="已作废" value="void" />
              <el-option label="挂单中" value="holding" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="交易流水"
            :subtitle="`共 ${filtered.length} 条`"
            :columns="tradeColumns"
            :rows="paged as unknown as Record<string, string | number>[]"
            :total="filtered.length"
            :page="page"
            @update:page="(p: number) => (page = p)"
          >
            <template #actions>
              <el-button plain @click="activeTab = 'hold'">挂单管理</el-button>
              <el-button type="primary" @click="activeTab = 'return'">退货受理</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 退货受理 -->
        <el-tab-pane label="退货受理" name="return">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="退货必须关联原交易单：退货数量不得超过「原购买数量 − 已退数量」，退款方式默认与原支付方式一致，退货操作全程留痕。"
            class="alert-gap"
          />
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="returnSearch" placeholder="请输入原交易号或扫描小票条码" style="width: 340px">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button type="primary" @click="onFindOriginal">调出原单</el-button>
          </div>

          <section v-if="originalTrade" class="panel">
            <div class="panel-head">
              <div class="panel-title">
                原交易信息
                <small>{{ originalTrade.tradeNo }}</small>
              </div>
              <el-tag type="success" effect="light" size="small">已完成</el-tag>
            </div>
            <el-descriptions :column="4" border size="small" class="mb-16">
              <el-descriptions-item label="交易时间">{{ originalTrade.tradeTime }}</el-descriptions-item>
              <el-descriptions-item label="收银员">{{ originalTrade.cashier }}</el-descriptions-item>
              <el-descriptions-item label="支付方式">{{ PAY_METHOD_TEXT[originalTrade.payMethod] }}</el-descriptions-item>
              <el-descriptions-item label="实收金额">¥{{ formatMoney(originalTrade.paidAmount) }}</el-descriptions-item>
            </el-descriptions>

            <el-table :data="returnItems" border size="small">
              <el-table-column prop="name" label="商品" min-width="220" />
              <el-table-column prop="price" label="成交单价" width="110" align="right">
                <template #default="{ row }">¥{{ formatMoney(row.price) }}</template>
              </el-table-column>
              <el-table-column prop="bought" label="原购买数量" width="120" align="right" />
              <el-table-column prop="returned" label="已退数量" width="110" align="right" />
              <el-table-column label="本次退货" width="140">
                <template #default="{ row }">
                  <el-input-number v-model="row.qty" :min="0" :max="row.bought - row.returned" size="small" controls-position="right" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="退款金额" width="120" align="right">
                <template #default="{ row }">¥{{ formatMoney(row.qty * row.price) }}</template>
              </el-table-column>
            </el-table>

            <div class="return-foot">
              <span>退货原因</span>
              <el-select v-model="returnReason" style="width: 220px" placeholder="请选择退货原因">
                <el-option label="商品质量问题" value="quality" />
                <el-option label="顾客买错" value="wrong" />
                <el-option label="临期商品" value="expire" />
                <el-option label="其他" value="other" />
              </el-select>
              <div class="spacer"></div>
              <span class="refund-total">应退金额：<b class="num">¥{{ formatMoney(refundTotal) }}</b></span>
              <el-button type="primary" @click="onSubmitReturn">确认退货</el-button>
            </div>
          </section>

          <el-empty v-else description="请输入交易号调出原单，或从交易流水中选择一笔交易办理退货" :image-size="90" />
        </el-tab-pane>

        <!-- 挂单管理 -->
        <el-tab-pane label="挂单管理" name="hold">
          <DataPanel
            title="挂单列表"
            subtitle="挂单不占用库存，交班时未处理的挂单将自动作废"
            :columns="holdColumns"
            :rows="holdRows as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button plain @click="msg('已作废全部挂单（演示）')">批量作废</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 交班对账 -->
        <el-tab-pane label="交班对账" name="session">
          <DataPanel
            title="收银会话"
            subtitle="按班次统计交易笔数、各支付方式金额与长短款差额"
            :columns="sessionColumns"
            :rows="sessions as unknown as Record<string, string | number>[]"
            :total="sessions.length"
            :page="1"
          />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import type { StatItem, TableColumn } from '@/types'
import { PAY_METHOD_TEXT, returnItemsOfTrade, sessionList, tradeList, tradeStats, type ReturnItemDraft } from '@/utils/mock'
import { formatMoney } from '@/utils/format'

const activeTab = ref('trade')
const keyword = ref('')
const cashier = ref('')
const status = ref('')
const page = ref(1)

const trades = tradeList(386)
const sStats = tradeStats()

const stats: StatItem[] = [
  { label: '今日销售额', value: `¥${formatMoney(sStats.amount)}`, delta: '不含已作废交易', deltaType: 'up' },
  { label: '今日交易笔数', value: sStats.count, delta: `挂单中 ${sStats.holding} 笔`, deltaType: 'up' },
  { label: '今日客单价', value: `¥${formatMoney(sStats.unitPrice)}`, delta: '按有效交易计算', deltaType: 'down' },
  { label: '退款金额', value: `¥${formatMoney(sStats.refund)}`, delta: '已退货交易合计', deltaType: 'up' },
]

const filtered = computed(() =>
  trades.filter((t) => {
    if (keyword.value && !t.tradeNo.includes(keyword.value)) return false
    if (cashier.value && t.cashier !== cashier.value) return false
    if (status.value && t.status !== status.value) return false
    return true
  }),
)

const paged = computed(() => filtered.value.slice((page.value - 1) * 20, page.value * 20))

const tradeColumns: TableColumn[] = [
  { prop: 'tradeNo', label: '交易号', width: 190 },
  { prop: 'tradeTime', label: '交易时间', width: 180 },
  { prop: 'itemCount', label: '商品件数', width: 110, align: 'right' },
  { prop: 'paidAmount', label: '实收金额', width: 130, align: 'right', render: 'money' },
  { prop: 'payMethod', label: '支付方式', width: 120, align: 'center', render: 'tag',
    tagMap: {
      cash: { text: '现金', type: 'success' },
      wechat: { text: '微信支付', type: 'primary' },
      alipay: { text: '支付宝', type: 'primary' },
      balance: { text: '储值余额', type: 'warning' },
      bank: { text: '银行卡', type: 'info' },
    } },
  { prop: 'cashier', label: '收银员', width: 100 },
  { prop: 'member', label: '会员', width: 120 },
  {
    prop: 'status',
    label: '交易状态',
    width: 120,
    align: 'center',
    render: 'tag',
    tagMap: {
      normal: { text: '已完成', type: 'success' },
      returned: { text: '已退货', type: 'danger' },
      partly_returned: { text: '部分退货', type: 'warning' },
      void: { text: '已作废', type: 'info' },
      holding: { text: '挂单中', type: 'primary' },
    },
  },
]

function resetQuery(): void {
  keyword.value = ''
  cashier.value = ''
  status.value = ''
  page.value = 1
}

/* ---------------- 退货 ---------------- */
const returnSearch = ref('')
const originalTrade = ref<(typeof trades)[number] | null>(null)
const returnReason = ref('')

/** 退货明细：由原交易单带出，遵循「退货数量 ≤ 原购买数量 − 已退数量」 */
const returnItems = ref<ReturnItemDraft[]>([])

const refundTotal = computed(() => returnItems.value.reduce((sum, item) => sum + item.qty * item.price, 0))

function loadTrade(trade: (typeof trades)[number]): void {
  originalTrade.value = trade
  returnSearch.value = trade.tradeNo
  returnItems.value = returnItemsOfTrade(trade.id)
}

function onFindOriginal(): void {
  const kw = returnSearch.value.trim()
  if (!kw) {
    const first = trades.find((t) => t.status === 'normal')
    if (!first) {
      ElMessage.warning('暂无可办理退货的交易')
      return
    }
    loadTrade(first)
    ElMessage.success('已调出原交易单')
    return
  }
  const found = trades.find((t) => t.tradeNo.includes(kw))
  if (!found) {
    ElMessage.error('未找到该交易，请核对交易号')
    return
  }
  if (found.status === 'void') {
    ElMessage.error('该交易已作废，无法办理退货')
    return
  }
  if (found.status === 'returned') {
    ElMessage.error('该交易已全部退货')
    return
  }
  loadTrade(found)
  ElMessage.success('已调出原交易单')
}

function onSubmitReturn(): void {
  if (returnItems.value.length === 0) {
    ElMessage.warning('请先调出原交易单')
    return
  }
  const total = refundTotal.value
  if (total <= 0) {
    ElMessage.warning('请至少选择一件退货商品并填写数量')
    return
  }
  if (!returnReason.value) {
    ElMessage.warning('请选择退货原因')
    return
  }
  // 业务规则：退货数量不得超过可退数量
  const invalid = returnItems.value.find((i) => i.qty > i.bought - i.returned)
  if (invalid) {
    ElMessage.error(`「${invalid.name}」退货数量超过可退数量`)
    return
  }
  ElMessage.success(`退货已受理，应退 ¥${formatMoney(total)}，库存已回增`)
  returnItems.value.forEach((item) => (item.qty = 0))
  originalTrade.value = null
  returnItems.value = []
  returnSearch.value = ''
  returnReason.value = ''
}

/* ---------------- 挂单 ---------------- */
const holdRows = computed(() =>
  trades
    .filter((t) => t.status === 'holding')
    .slice(0, 8)
    .map((t) => ({
      holdNo: t.tradeNo.replace('S', 'GD'),
      itemCount: t.itemCount,
      totalAmount: t.paidAmount,
      cashier: t.cashier,
      createdAt: t.tradeTime,
      status: 'holding',
    })),
)

const holdColumns: TableColumn[] = [
  { prop: 'holdNo', label: '挂单号', width: 190 },
  { prop: 'itemCount', label: '商品件数', width: 110, align: 'right' },
  { prop: 'totalAmount', label: '暂存金额', width: 130, align: 'right', render: 'money' },
  { prop: 'cashier', label: '收银员', width: 100 },
  { prop: 'createdAt', label: '挂单时间', width: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: { holding: { text: '挂单中', type: 'primary' } },
  },
]

/* ---------------- 交班对账 ---------------- */
const sessions = sessionList(24)

const sessionColumns: TableColumn[] = [
  { prop: 'sessionNo', label: '会话编号', width: 160 },
  { prop: 'cashier', label: '收银员', width: 100 },
  { prop: 'startAt', label: '开班时间', width: 180 },
  { prop: 'endAt', label: '交班时间', width: 180 },
  { prop: 'orderCount', label: '交易笔数', width: 110, align: 'right' },
  { prop: 'saleAmount', label: '销售额', width: 130, align: 'right', render: 'money' },
  { prop: 'returnAmount', label: '退款额', width: 110, align: 'right', render: 'money' },
  { prop: 'cashAmount', label: '应收现金', width: 120, align: 'right', render: 'money' },
  { prop: 'actualCash', label: '实收现金', width: 120, align: 'right', render: 'money' },
  { prop: 'diff', label: '长短款', width: 110, align: 'right', render: 'money' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      open: { text: '进行中', type: 'primary' },
      closed: { text: '已交班', type: 'success' },
    },
  },
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

.mb-16 {
  margin-bottom: 16px;
}

.return-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.return-foot .spacer {
  flex: 1;
}

.refund-total {
  font-size: 13px;
  color: var(--text-secondary);
}

.refund-total b {
  font-size: 18px;
  color: var(--color-error);
  margin-left: 4px;
}
</style>
