<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 采购订单 -->
        <el-tab-pane label="采购订单" name="order">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="采购单号 / 供应商" clearable style="width: 240px" />
            <el-select v-model="supplier" placeholder="全部供应商" clearable style="width: 190px">
              <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.name" />
            </el-select>
            <el-select v-model="status" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="草稿" value="draft" />
              <el-option label="已下单" value="ordered" />
              <el-option label="部分到货" value="partly_received" />
              <el-option label="已到货" value="received" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="采购订单列表"
            :subtitle="`共 ${filtered.length} 条`"
            :columns="orderColumns"
            :rows="paged as unknown as Record<string, string | number>[]"
            :total="filtered.length"
            :page="page"
            @update:page="(p: number) => (page = p)"
          >
            <template #actions>
              <el-button plain @click="msg('已进入批量下单模式（演示）')">批量下单</el-button>
              <el-button type="primary" :icon="Plus" @click="openOrderDialog">新建采购订单</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 到货入库 -->
        <el-tab-pane label="到货入库" name="receipt">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="到货入库须引用采购订单：系统自动带出商品明细，录入实收数量与实收单价后库存自动增加并写入库存流水；实收与订单不一致时请填写差异说明。"
            class="alert-gap"
          />
          <DataPanel
            title="待入库订单"
            subtitle="已下单 / 部分到货的订单可办理入库"
            :columns="pendingColumns"
            :rows="pendingOrders as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" @click="msg('请在上方选择订单后点击「办理入库」')">办理入库</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 供应商管理 -->
        <el-tab-pane label="供应商管理" name="supplier">
          <DataPanel
            title="供应商档案"
            :subtitle="`共 ${suppliers.length} 家`"
            show-index
            :columns="supplierColumns"
            :rows="suppliers as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" :icon="Plus" @click="msg('打开新增供应商表单（演示）')">新增供应商</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 采购记录 -->
        <el-tab-pane label="采购记录" name="record">
          <DataPanel
            title="采购记录"
            subtitle="统计口径为已到货订单的实收金额"
            :columns="recordColumns"
            :rows="recordRows as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          />
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- 新建采购订单 -->
    <el-dialog v-model="orderVisible" title="新建采购订单" width="720px">
      <el-form :model="orderForm" label-width="96px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-select v-model="orderForm.supplier" style="width: 100%" placeholder="请选择供应商">
                <el-option v-for="s in suppliers.slice(0, 8)" :key="s.id" :label="s.name" :value="s.name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预计到货">
              <el-date-picker v-model="orderForm.expectDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="采购商品">
          <el-table :data="orderForm.items" size="small" border>
            <el-table-column prop="name" label="商品" min-width="200" />
            <el-table-column label="数量" width="130">
              <template #default="{ row }">
                <el-input-number v-model="row.qty" :min="1" size="small" controls-position="right" style="width: 100%" />
              </template>
            </el-table-column>
            <el-table-column label="预计进价" width="130">
              <template #default="{ row }">
                <el-input-number v-model="row.price" :min="0" :precision="2" size="small" controls-position="right" style="width: 100%" />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="orderForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="orderVisible = false">取消</el-button>
        <el-button @click="submitOrder(true)">保存草稿</el-button>
        <el-button type="primary" @click="submitOrder(false)">提交订单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import type { StatItem, TableColumn } from '@/types'
import { productList, purchaseOrderList, purchaseStats, supplierList } from '@/utils/mock'
import { formatMoney } from '@/utils/format'

const activeTab = ref('order')
const keyword = ref('')
const supplier = ref('')
const status = ref('')
const page = ref(1)

const suppliers = supplierList()
const orders = purchaseOrderList(68)
const pStats = purchaseStats()

const stats: StatItem[] = [
  { label: '本月采购总额', value: `¥${formatMoney(pStats.monthAmount)}`, delta: '按已下单金额统计', deltaType: 'up' },
  { label: '待入库订单', value: pStats.pending, delta: '已下单 / 部分到货', deltaType: 'up' },
  { label: '合作供应商', value: pStats.supplierCount, delta: `共 ${suppliers.length} 家`, deltaType: 'up' },
  { label: '采购订单总数', value: orders.length, delta: '含全部状态', deltaType: 'up' },
]

const filtered = computed(() =>
  orders.filter((o) => {
    if (keyword.value && !o.orderNo.includes(keyword.value) && !o.supplier.includes(keyword.value)) return false
    if (supplier.value && o.supplier !== supplier.value) return false
    if (status.value && o.status !== status.value) return false
    return true
  }),
)

const paged = computed(() => filtered.value.slice((page.value - 1) * 20, page.value * 20))

const orderColumns: TableColumn[] = [
  { prop: 'orderNo', label: '采购单号', width: 170 },
  { prop: 'supplier', label: '供应商', minWidth: 190 },
  { prop: 'itemCount', label: '商品种类', width: 110, align: 'right' },
  { prop: 'totalAmount', label: '采购金额', width: 130, align: 'right', render: 'money' },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    align: 'center',
    render: 'tag',
    tagMap: {
      draft: { text: '草稿', type: 'info' },
      ordered: { text: '已下单', type: 'primary' },
      partly_received: { text: '部分到货', type: 'warning' },
      received: { text: '已到货', type: 'success' },
      cancelled: { text: '已取消', type: 'info' },
    },
  },
  { prop: 'expectArriveDate', label: '预计到货', width: 120 },
  { prop: 'creator', label: '创建人', width: 100 },
]

function resetQuery(): void {
  keyword.value = ''
  supplier.value = ''
  status.value = ''
  page.value = 1
}

/* ---------------- 到货入库 ---------------- */
const pendingOrders = computed(() =>
  orders.filter((o) => o.status === 'ordered' || o.status === 'partly_received').slice(0, 12),
)

const pendingColumns: TableColumn[] = [
  { prop: 'orderNo', label: '采购单号', width: 170 },
  { prop: 'supplier', label: '供应商', minWidth: 190 },
  { prop: 'itemCount', label: '商品种类', width: 110, align: 'right' },
  { prop: 'totalAmount', label: '订单金额', width: 130, align: 'right', render: 'money' },
  { prop: 'expectArriveDate', label: '预计到货', width: 130 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    align: 'center',
    render: 'tag',
    tagMap: {
      ordered: { text: '已下单', type: 'primary' },
      partly_received: { text: '部分到货', type: 'warning' },
    },
  },
]

/* ---------------- 供应商 ---------------- */
const supplierColumns: TableColumn[] = [
  { prop: 'code', label: '供应商编码', width: 130 },
  { prop: 'name', label: '供应商名称', minWidth: 190 },
  { prop: 'contact', label: '联系人', width: 100 },
  { prop: 'phone', label: '联系电话', width: 140 },
  { prop: 'mainCategory', label: '主营范围', minWidth: 150 },
  { prop: 'settleType', label: '结算方式', width: 120 },
  { prop: 'orderCount', label: '合作订单', width: 110, align: 'right' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      on: { text: '合作中', type: 'success' },
      off: { text: '已停用', type: 'info' },
    },
  },
]

/* ---------------- 采购记录 ---------------- */
const recordRows = computed(() =>
  orders
    .filter((o) => o.status === 'received')
    .slice(0, 12)
    .map((o) => ({
      ...o,
      receiptNo: o.orderNo.replace('CG', 'RK'),
      receiptDate: o.expectArriveDate,
      actualAmount: Math.round(o.totalAmount * 0.98 * 100) / 100,
      operator: '张建国',
    })),
)

const recordColumns: TableColumn[] = [
  { prop: 'receiptNo', label: '入库单号', width: 170 },
  { prop: 'orderNo', label: '关联采购单', width: 170 },
  { prop: 'supplier', label: '供应商', minWidth: 180 },
  { prop: 'itemCount', label: '商品种类', width: 110, align: 'right' },
  { prop: 'actualAmount', label: '实收金额', width: 130, align: 'right', render: 'money' },
  { prop: 'receiptDate', label: '入库日期', width: 120 },
  { prop: 'operator', label: '入库人', width: 100 },
]

/* ---------------- 新建采购订单 ---------------- */
const orderVisible = ref(false)
const orderForm = reactive({
  supplier: '',
  expectDate: '',
  remark: '',
  items: [
    { name: '伊利纯牛奶 250ml×12', qty: 20, price: 42 },
    { name: '农夫山泉饮用天然水 550ml×24', qty: 15, price: 28.5 },
    { name: '乐事薯片 原味 70g', qty: 60, price: 4.6 },
  ],
})

function openOrderDialog(): void {
  // 初始商品取自库存预警建议（演示：直接取前三个商品）
  const top = productList(3)
  orderForm.items = top.map((p) => ({ name: p.name, qty: 20, price: p.purchasePrice }))
  orderVisible.value = true
}

function submitOrder(asDraft: boolean): void {
  if (!orderForm.supplier) {
    ElMessage.warning('请选择供应商')
    return
  }
  orderVisible.value = false
  ElMessage.success(asDraft ? '已保存为草稿' : '采购订单已提交，等待到货入库')
}

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
