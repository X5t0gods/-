<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 库存查询 -->
        <el-tab-pane label="库存查询" name="query">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="商品名称 / 条码" clearable style="width: 240px" />
            <el-select v-model="category" placeholder="全部分类" clearable style="width: 160px">
              <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="warehouse" style="width: 160px">
              <el-option label="全部仓库" value="all" />
              <el-option label="主仓" value="main" />
              <el-option label="货架区" value="shelf" />
              <el-option label="冷冻区" value="frozen" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="库存明细"
            :subtitle="`共 ${filtered.length} 条`"
            show-index
            :columns="stockColumns"
            :rows="paged as unknown as Record<string, string | number>[]"
            :total="filtered.length"
            :page="page"
            @update:page="(p: number) => (page = p)"
          >
            <template #actions>
              <el-button plain @click="msg('已进入批量盘点模式（演示）')">批量盘点</el-button>
              <el-button type="primary" @click="openAdjust">库存调整</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 库存流水 -->
        <el-tab-pane label="库存流水" name="flow">
          <DataPanel
            title="库存流水"
            subtitle="所有库存变动均留痕，仅追加不修改"
            :columns="flowColumns"
            :rows="flows as unknown as Record<string, string | number>[]"
            :total="flows.length"
            :page="1"
          />
        </el-tab-pane>

        <!-- 库存预警 -->
        <el-tab-pane label="库存预警" name="alert">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            title="以下商品库存已低于安全库存线，建议尽快补货；建议补货量按「安全库存 × 2 − 当前库存」估算。"
            class="alert-gap"
          />
          <DataPanel
            title="库存预警清单"
            :subtitle="`共 ${alertRows.length} 项`"
            :columns="alertColumns"
            :rows="alertRows as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" :icon="ShoppingCart" @click="msg('已生成采购订单草稿（演示）')">
                生成补货建议
              </el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 库存盘点 -->
        <el-tab-pane label="库存盘点" name="taking">
          <DataPanel
            title="盘点单"
            subtitle="创建盘点单后录入实盘数量，系统自动计算差异，确认后调整库存"
            show-index
            :columns="takingColumns"
            :rows="takingRows as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button type="primary" :icon="Plus" @click="msg('已创建盘点单 PD20260914001（演示）')">
                新建盘点
              </el-button>
            </template>
          </DataPanel>
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- 库存调整弹窗 -->
    <el-dialog v-model="adjustVisible" title="库存调整" width="460px">
      <el-form label-width="90px">
        <el-form-item label="商品">
          <el-input v-model="adjustForm.product" placeholder="请输入商品名称或条码" />
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="adjustForm.warehouse" style="width: 100%">
            <el-option label="主仓" value="主仓" />
            <el-option label="货架区" value="货架区" />
          </el-select>
        </el-form-item>
        <el-form-item label="调整数量">
          <el-input-number v-model="adjustForm.qty" :min="-9999" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="调整原因">
          <el-select v-model="adjustForm.reason" style="width: 100%" placeholder="请选择原因">
            <el-option label="货架整理差异" value="货架整理差异" />
            <el-option label="录入错误修正" value="录入错误修正" />
            <el-option label="供应商补货" value="供应商补货" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="adjustForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Search, ShoppingCart } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import type { StatItem, TableColumn } from '@/types'
import { CATEGORIES, CHANGE_TYPE_TEXT, expiringProducts, productList, productStats, stockFlowList } from '@/utils/mock'
import { formatDate, formatMoney, dayOffset } from '@/utils/format'

const activeTab = ref('query')
const keyword = ref('')
const category = ref('')
const warehouse = ref('all')
const page = ref(1)

/** 库存指标由商品数据集推导，避免卡片与列表不一致 */
const pStats = productStats()
const expiring = expiringProducts(7)

const stats: StatItem[] = [
  { label: '库存总金额', value: `¥${formatMoney(pStats.stockAmount)}`, delta: '按最近进价估算', deltaType: 'up' },
  { label: '库存商品数', value: pStats.total, delta: `在售 ${pStats.onSale}`, deltaType: 'up' },
  { label: '低库存商品', value: pStats.alert, delta: `其中缺货 ${pStats.out}`, deltaType: 'down' },
  { label: '临期商品', value: expiring.length, delta: '保质期剩余 ≤ 7 天', deltaType: 'up' },
]

const allProducts = productList()

const filtered = computed(() =>
  allProducts.filter((p) => {
    if (keyword.value && !p.name.includes(keyword.value) && !p.barcode.includes(keyword.value)) return false
    if (category.value && p.category !== category.value) return false
    return true
  }),
)

/** 分页数据：额外推导「库存状态」——由库存量与安全库存比较得出，与商品上下架状态区分开 */
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * 20, page.value * 20).map((p) => ({
    ...p,
    stockStatus:
      p.status === 'off' ? 'off' : p.stock === 0 ? 'out' : p.stock < p.safeStock ? 'low' : 'normal',
  })),
)

const stockColumns: TableColumn[] = [
  { prop: 'name', label: '商品名称', minWidth: 240 },
  { prop: 'category', label: '分类', width: 100 },
  { prop: 'stock', label: '当前库存', width: 110, align: 'right', render: 'num' },
  { prop: 'safeStock', label: '安全库存', width: 110, align: 'right', render: 'num' },
  {
    prop: 'stockStatus',
    label: '库存状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      normal: { text: '正常', type: 'success' },
      low: { text: '低库存', type: 'warning' },
      out: { text: '缺货', type: 'danger' },
      off: { text: '已停售', type: 'info' },
    },
  },
]

function resetQuery(): void {
  keyword.value = ''
  category.value = ''
  warehouse.value = 'all'
  page.value = 1
}

/* ---------------- 库存流水 ---------------- */
const flows = stockFlowList(60)

const flowColumns: TableColumn[] = [
  { prop: 'productName', label: '商品名称', minWidth: 220 },
  { prop: 'changeType', label: '变动类型', width: 120, align: 'center', render: 'tag',
    tagMap: {
      purchase_in: { text: '采购入库', type: 'success' },
      sale_out: { text: '销售出库', type: 'primary' },
      return_in: { text: '退货入库', type: 'info' },
      loss_out: { text: '报损出库', type: 'danger' },
      stocktake: { text: '盘点调整', type: 'warning' },
      manual: { text: '手工调整', type: 'info' },
    } },
  { prop: 'changeQty', label: '变动数量', width: 110, align: 'right' },
  { prop: 'afterQty', label: '变动后库存', width: 120, align: 'right', render: 'num' },
  { prop: 'refNo', label: '来源单号', width: 170 },
  { prop: 'operator', label: '操作人', width: 100 },
  { prop: 'createdAt', label: '变动时间', width: 180 },
]

void CHANGE_TYPE_TEXT

/* ---------------- 库存预警 ---------------- */
const alertRows = computed(() =>
  allProducts
    .filter((p) => p.status === 'low' || p.status === 'out')
    .slice(0, 12)
    .map((p) => ({
      ...p,
      suggest: Math.max(p.safeStock * 2 - p.stock, 1),
      level: p.stock === 0 ? 'out' : 'low',
    })),
)

const alertColumns: TableColumn[] = [
  { prop: 'name', label: '商品', minWidth: 240 },
  { prop: 'category', label: '分类', width: 100 },
  { prop: 'stock', label: '当前库存', width: 110, align: 'right', render: 'num' },
  { prop: 'safeStock', label: '安全库存', width: 110, align: 'right', render: 'num' },
  { prop: 'suggest', label: '建议补货量', width: 120, align: 'right', render: 'num' },
  {
    prop: 'level',
    label: '状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      low: { text: '低库存', type: 'warning' },
      out: { text: '缺货', type: 'danger' },
    },
  },
]

/* ---------------- 盘点 ---------------- */
const takingRows = [
  {
    id: 1,
    no: 'PD20260930001',
    range: '全部商品',
    bookQty: 1286,
    actualQty: 1281,
    diff: -5,
    diffAmount: -186.5,
    status: '已完成',
    creator: '张建国',
    createdAt: `${formatDate(dayOffset(-1))} 20:15`,
  },
  {
    id: 2,
    no: 'PD20260915001',
    range: '分类：饮料',
    bookQty: 286,
    actualQty: 284,
    diff: -2,
    diffAmount: -96.0,
    status: '待确认',
    creator: '张建国',
    createdAt: `${formatDate(dayOffset(0))} 09:40`,
  },
  {
    id: 3,
    no: 'PD20260831001',
    range: '分类：日用',
    bookQty: 214,
    actualQty: 214,
    diff: 0,
    diffAmount: 0,
    status: '已完成',
    creator: '郑爽',
    createdAt: `${formatDate(dayOffset(-14))} 21:05`,
  },
]

const takingColumns: TableColumn[] = [
  { prop: 'no', label: '盘点单号', width: 170 },
  { prop: 'range', label: '盘点范围', minWidth: 140 },
  { prop: 'bookQty', label: '账面数', width: 100, align: 'right', render: 'num' },
  { prop: 'actualQty', label: '实盘数', width: 100, align: 'right', render: 'num' },
  { prop: 'diff', label: '差异', width: 90, align: 'right' },
  { prop: 'diffAmount', label: '差异金额', width: 120, align: 'right', render: 'money' },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      已完成: { text: '已完成', type: 'success' },
      待确认: { text: '待确认', type: 'warning' },
      盘点中: { text: '盘点中', type: 'primary' },
    },
  },
  { prop: 'creator', label: '创建人', width: 100 },
  { prop: 'createdAt', label: '创建时间', width: 170 },
]

/* ---------------- 库存调整 ---------------- */
const adjustVisible = ref(false)
const adjustForm = reactive({ product: '', warehouse: '主仓', qty: 0, reason: '', remark: '' })

function openAdjust(): void {
  adjustVisible.value = true
}

function submitAdjust(): void {
  if (!adjustForm.product || !adjustForm.reason || adjustForm.qty === 0) {
    ElMessage.warning('请填写商品、调整数量与调整原因')
    return
  }
  adjustVisible.value = false
  ElMessage.success('库存调整已提交，并已写入库存流水')
  Object.assign(adjustForm, { product: '', qty: 0, reason: '', remark: '' })
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
