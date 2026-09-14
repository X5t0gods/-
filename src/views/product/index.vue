<template>
  <div>
    <!-- 概览统计 -->
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- ============ 商品列表 ============ -->
        <el-tab-pane label="商品列表" name="list">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="query.keyword" placeholder="商品名称 / 条码" clearable style="width: 240px" />
            <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 160px">
              <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="在售" value="on" />
              <el-option label="低库存" value="low" />
              <el-option label="缺货" value="out" />
              <el-option label="停售" value="off" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search" @click="page = 1">查询</el-button>
          </div>

          <DataPanel
            title="商品列表"
            :subtitle="`共 ${filtered.length} 条`"
            show-index
            :columns="productColumns"
            :rows="pagedProducts"
            :total="filtered.length"
            :page="page"
            :page-size="pageSize"
            :show-pagination="true"
            @update:page="(p: number) => (page = p)"
          >
            <template #actions>
              <el-button plain @click="onBatchToggle">批量上下架</el-button>
              <el-button type="primary" :icon="Plus" @click="activeTab = 'form'">新增商品</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- ============ 商品分类 ============ -->
        <el-tab-pane label="商品分类" name="category">
          <DataPanel
            title="商品分类"
            subtitle="支持两级分类，删除前需先清空该分类下的商品"
            show-index
            :columns="categoryColumns"
            :rows="categories as unknown as Record<string, string | number>[]"
            :show-pagination="false"
          >
            <template #actions>
              <el-button plain :icon="Edit">调整排序</el-button>
              <el-button type="primary" :icon="Plus" @click="onAddCategory">新增分类</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- ============ 商品建档 ============ -->
        <el-tab-pane label="商品建档" name="form">
          <div class="form-wrap">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="支持扫码录入：使用扫码枪扫描商品条码后，系统会自动带出已有商品信息，避免重复建档。"
              class="form-alert"
            />
            <el-form :model="productForm" label-width="110px" class="product-form">
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="商品条码" required>
                    <el-input v-model="productForm.barcode" placeholder="扫描或输入条码">
                      <template #append>
                        <el-button :icon="FullScreen" @click="onScan">扫码</el-button>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品名称" required>
                    <el-input v-model="productForm.name" placeholder="请输入商品名称" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="规格">
                    <el-input v-model="productForm.spec" placeholder="如 250ml×12" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="计量单位">
                    <el-select v-model="productForm.unit" style="width: 100%">
                      <el-option v-for="u in ['件', '箱', '袋', '瓶', '盒', '斤', '组']" :key="u" :label="u" :value="u" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="所属分类" required>
                    <el-select v-model="productForm.category" style="width: 100%" placeholder="请选择分类">
                      <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="默认供应商">
                    <el-select v-model="productForm.supplier" style="width: 100%" clearable>
                      <el-option v-for="s in supplierList().slice(0, 6)" :key="s.id" :label="s.name" :value="s.name" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="进货价">
                    <el-input-number v-model="productForm.purchasePrice" :min="0" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="零售价" required>
                    <el-input-number v-model="productForm.salePrice" :min="0" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="会员价">
                    <el-input-number v-model="productForm.memberPrice" :min="0" :precision="2" :step="0.5" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="安全库存">
                    <el-input-number v-model="productForm.safeStock" :min="0" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="保质期（天）">
                    <el-input-number v-model="productForm.shelfLifeDays" :min="0" style="width: 100%" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="商品状态">
                    <el-radio-group v-model="productForm.status">
                      <el-radio value="on">在售</el-radio>
                      <el-radio value="off">停售</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
                <el-col :span="24">
                  <el-form-item label="备注">
                    <el-input v-model="productForm.remark" type="textarea" :rows="2" placeholder="选填" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item>
                <el-button @click="onResetForm">重置</el-button>
                <el-button plain @click="onSaveProduct(true)">保存并继续录入</el-button>
                <el-button type="primary" @click="onSaveProduct(false)">保存商品</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- ============ 价签打印 ============ -->
        <el-tab-pane label="价签打印" name="label">
          <el-row :gutter="20">
            <el-col :xs="24" :md="14">
              <DataPanel
                title="选择商品"
                subtitle="勾选后生成价签"
                :columns="labelColumns"
                :rows="labelSource"
                :show-pagination="false"
                :show-export="false"
                selectable
                @selection-change="onLabelSelect"
              />
            </el-col>
            <el-col :xs="24" :md="10">
              <section class="panel">
                <div class="panel-head">
                  <div class="panel-title">价签预览</div>
                  <el-button type="primary" size="small" :icon="Printer" @click="onPrint">打印</el-button>
                </div>
                <div v-if="selectedLabels.length === 0" class="label-empty">
                  <el-empty description="请在左侧勾选需要打印价签的商品" :image-size="70" />
                </div>
                <div v-else class="label-grid">
                  <div v-for="p in selectedLabels" :key="String(p.id)" class="price-label">
                    <div class="label-name">{{ p.name }}</div>
                    <div class="label-spec">{{ p.spec }} / {{ p.unit }}</div>
                    <div class="label-price">
                      <span class="symbol">¥</span>{{ Number(p.salePrice).toFixed(2) }}
                    </div>
                    <div class="label-barcode-wrap">
                      <svg
                        class="label-barcode-svg"
                        :viewBox="`0 0 ${barcodeBars(String(p.barcode)).length * 2} 26`"
                        preserveAspectRatio="none"
                      >
                        <rect
                          v-for="(b, bi) in barcodeBars(String(p.barcode))"
                          :key="bi"
                          :x="bi * 2"
                          y="0"
                          :width="b.w"
                          height="26"
                          :fill="b.on ? '#1f2733' : 'transparent'"
                        />
                      </svg>
                      <div class="label-barcode">{{ p.barcode }}</div>
                    </div>
                  </div>
                </div>
              </section>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Edit, FullScreen, Plus, Printer, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import type { StatItem, TableColumn, TableRow } from '@/types'
import { CATEGORIES, categoryList, productList, supplierList, type ProductRow } from '@/utils/mock'
import { formatDateTime } from '@/utils/format'

const activeTab = ref('list')

/* ---------------- 商品列表 ---------------- */
/** 商品数据（可写：新建商品会立即进入列表，满足「保存后立即可被检索」） */
const allProducts = ref<ProductRow[]>([...productList()])

/** 指标由当前列表实时推导，保证卡片数字与表格内容一致 */
const stats = computed<StatItem[]>(() => {
  const list = allProducts.value
  const total = list.length || 1
  const off = list.filter((p) => p.status === 'off').length
  const alert = list.filter((p) => p.status === 'low' || p.status === 'out').length
  return [
    { label: '商品总数', value: list.length, delta: '实时统计', deltaType: 'up' },
    {
      label: '在售商品',
      value: list.length - off,
      delta: `占比 ${(((list.length - off) / total) * 100).toFixed(1)}%`,
      deltaType: 'up',
    },
    { label: '停售商品', value: off, delta: `占比 ${((off / total) * 100).toFixed(1)}%`, deltaType: 'down' },
    { label: '库存预警', value: alert, delta: '低库存 + 缺货', deltaType: 'up' },
  ]
})

const query = reactive({ keyword: '', category: '', status: '' })
const page = ref(1)
const pageSize = 20

const filtered = computed(() =>
  allProducts.value.filter((p) => {
    if (query.keyword && !p.name.includes(query.keyword) && !p.barcode.includes(query.keyword)) return false
    if (query.category && p.category !== query.category) return false
    if (query.status && p.status !== query.status) return false
    return true
  }),
)

const pagedProducts = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize) as unknown as TableRow[],
)

const productColumns: TableColumn[] = [
  { prop: 'name', label: '商品名称', minWidth: 240 },
  { prop: 'barcode', label: '条码', width: 140 },
  { prop: 'category', label: '分类', width: 100 },
  { prop: 'salePrice', label: '售价', width: 110, align: 'right', render: 'money' },
  { prop: 'stock', label: '库存', width: 100, align: 'right', render: 'num' },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      on: { text: '在售', type: 'success' },
      low: { text: '低库存', type: 'warning' },
      out: { text: '缺货', type: 'danger' },
      off: { text: '停售', type: 'info' },
    },
  },
]

function resetQuery(): void {
  query.keyword = ''
  query.category = ''
  query.status = ''
  page.value = 1
}

function onBatchToggle(): void {
  ElMessage.success('已提交批量上下架任务（演示模式）')
}

/* ---------------- 商品分类 ---------------- */
const categories = categoryList()

const categoryColumns: TableColumn[] = [
  { prop: 'name', label: '分类名称', minWidth: 160 },
  { prop: 'code', label: '分类编码', width: 140 },
  { prop: 'productCount', label: '商品数量', width: 120, align: 'right', render: 'num' },
  { prop: 'sort', label: '排序', width: 90, align: 'center' },
]

function onAddCategory(): void {
  ElMessageBox.prompt('请输入新分类名称', '新增分类', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '分类名称不能为空',
  })
    .then(() => ElMessage.success('分类已新增（演示模式）'))
    .catch(() => undefined)
}

/* ---------------- 商品建档 ---------------- */
const productForm = reactive({
  barcode: '',
  name: '',
  spec: '',
  unit: '件',
  category: '',
  supplier: '',
  purchasePrice: 0,
  salePrice: 0,
  memberPrice: 0,
  safeStock: 30,
  shelfLifeDays: 180,
  status: 'on',
  remark: '',
})

function onResetForm(): void {
  Object.assign(productForm, {
    barcode: '',
    name: '',
    spec: '',
    unit: '件',
    category: '',
    supplier: '',
    purchasePrice: 0,
    salePrice: 0,
    memberPrice: 0,
    safeStock: 30,
    shelfLifeDays: 180,
    status: 'on',
    remark: '',
  })
}

let scanCursor = 0
/** 模拟扫码枪：带出一条已有商品的信息（对应需求「扫码后自动带出商品信息」） */
function onScan(): void {
  const pool = allProducts.value
  if (pool.length === 0) return
  const sample = pool[scanCursor++ % pool.length]!
  productForm.barcode = sample.barcode
  productForm.name = sample.name
  productForm.spec = sample.spec
  productForm.unit = sample.unit
  productForm.category = sample.category
  productForm.purchasePrice = sample.purchasePrice
  productForm.salePrice = sample.salePrice
  productForm.safeStock = sample.safeStock
  ElMessage.success(`已扫描条码 ${sample.barcode}，自动带出商品信息`)
}

function onSaveProduct(continueAdd: boolean): void {
  if (!productForm.barcode || !productForm.name || !productForm.category) {
    ElMessage.warning('请填写商品条码、名称与所属分类')
    return
  }
  // 业务规则：条码在同一门店内唯一
  if (allProducts.value.some((p) => p.barcode === productForm.barcode)) {
    ElMessage.error(`该条码已存在商品，请核对后重新录入`)
    return
  }
  if (productForm.salePrice > 0 && productForm.salePrice < productForm.purchasePrice) {
    ElMessage.warning('零售价低于进货价，请确认售价是否填写正确')
  }

  const newProduct: ProductRow = {
    id: Math.max(0, ...allProducts.value.map((p) => p.id)) + 1,
    barcode: productForm.barcode,
    name: productForm.name,
    spec: productForm.spec,
    unit: productForm.unit,
    category: productForm.category,
    purchasePrice: productForm.purchasePrice,
    salePrice: productForm.salePrice,
    memberPrice: productForm.memberPrice > 0 ? productForm.memberPrice : null,
    stock: 0,
    safeStock: productForm.safeStock,
    shelfLifeDays: productForm.shelfLifeDays > 0 ? productForm.shelfLifeDays : null,
    status: productForm.status === 'off' ? 'off' : 'on',
    supplier: productForm.supplier,
    updatedAt: formatDateTime(new Date()),
  }
  allProducts.value.unshift(newProduct)
  ElMessage.success(`商品「${productForm.name}」已保存，可在商品列表中检索到`)

  if (continueAdd) {
    // 连续建档时保留分类与供应商，减少重复选择
    const keepCategory = productForm.category
    const keepSupplier = productForm.supplier
    onResetForm()
    productForm.category = keepCategory
    productForm.supplier = keepSupplier
  } else {
    page.value = 1
    activeTab.value = 'list'
  }
}

/* ---------------- 价签打印 ---------------- */
const labelSource = computed(() => allProducts.value.slice(0, 12) as unknown as TableRow[])
const selectedLabels = ref<TableRow[]>([])

const labelColumns: TableColumn[] = [
  { prop: 'name', label: '商品名称', minWidth: 220 },
  { prop: 'spec', label: '规格', width: 110 },
  { prop: 'salePrice', label: '售价', width: 100, align: 'right', render: 'money' },
]

function onLabelSelect(rows: TableRow[]): void {
  selectedLabels.value = rows.slice(0, 6)
}

/** 按条码数字生成条纹，用于价签上的条码图形（UR-PRD-04：价签须含条码） */
function barcodeBars(code: string) {
  const digits = code.replace(/\D/g, '').split('').map(Number)
  const bars: Array<{ w: number; on: boolean }> = []
  digits.forEach((d) => {
    bars.push({ w: 1 + (d % 3), on: true })
    bars.push({ w: 1 + (d % 2), on: false })
    bars.push({ w: 1 + ((d + 1) % 3), on: true })
    bars.push({ w: 1, on: false })
  })
  return bars
}

function onPrint(): void {
  ElMessage.success(`已提交 ${selectedLabels.value.length} 张价签打印任务`)
}
</script>

<style scoped>
.filter-bar--inner {
  padding: 0;
  margin-bottom: 14px;
  background: transparent;
  border-radius: 0;
}

.form-wrap {
  max-width: 1000px;
}

.form-alert {
  margin-bottom: 20px;
}

.product-form {
  padding-top: 4px;
}

.label-empty {
  padding: 20px 0;
}

.label-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.price-label {
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.label-name {
  font-size: 12.5px;
  color: var(--text-primary);
  height: 36px;
  overflow: hidden;
  line-height: 1.4;
}

.label-spec {
  font-size: 11px;
  color: var(--text-placeholder);
  margin: 4px 0 8px;
}

.label-price {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-error);
  line-height: 1.1;
}

.label-price .symbol {
  font-size: 14px;
  margin-right: 1px;
}

.label-barcode-wrap {
  margin-top: 8px;
  padding: 0 4px;
  background: #ffffff;
}

.label-barcode-svg {
  display: block;
  width: 100%;
  height: 26px;
}

.label-barcode {
  margin-top: 2px;
  font-size: 10px;
  color: var(--text-placeholder);
  letter-spacing: 1px;
  font-family: Consolas, monospace;
}
</style>
