<template>
  <section class="panel panel--flat">
    <header class="panel-head panel-head--inset">
      <div class="panel-title">
        {{ title }}
        <small v-if="subtitle">{{ subtitle }}</small>
        <small v-else-if="totalText">{{ totalText }}</small>
      </div>
      <div class="panel-actions">
        <slot name="actions" />
        <el-button v-if="showExport" plain :icon="Download" @click="onExport">导出</el-button>
      </div>
    </header>

    <el-table
      :data="rows"
      :row-key="rowKey"
      stripe
      border
      size="default"
      header-cell-class-name="table-head"
      :max-height="maxHeight"
      @selection-change="onSelectionChange"
    >
      <el-table-column v-if="selectable" type="selection" width="46" align="center" />
      <el-table-column v-if="showIndex" type="index" label="#" width="60" align="center" :index="indexMethod" />

      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align || 'left'"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span v-if="col.render === 'tag'" class="cell-tag">
            <el-tag :type="tagOf(col, row[col.prop])" size="small" effect="light">
              {{ tagText(col, row[col.prop]) }}
            </el-tag>
          </span>
          <span v-else-if="col.render === 'money'" class="num">{{ money(row[col.prop] as number) }}</span>
          <span v-else-if="col.render === 'num'" class="num">{{ formatInt(row[col.prop] as number) }}</span>
          <span v-else>{{ row[col.prop] ?? '—' }}</span>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty description="暂无数据" :image-size="80" />
      </template>
    </el-table>

    <footer v-if="showPagination" class="table-footer">
      <span>共 {{ total }} 条 · 每页 {{ pageSize }} 条</span>
      <el-pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, jumper"
        background
        @current-change="onPageChange"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { TableColumn, TableRow, TagType } from '@/types'
import { formatInt, money } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    columns: TableColumn[]
    rows: TableRow[]
    total?: number
    page?: number
    pageSize?: number
    rowKey?: string
    showIndex?: boolean
    showExport?: boolean
    showPagination?: boolean
    selectable?: boolean
    maxHeight?: number
  }>(),
  {
    total: 0,
    page: 1,
    pageSize: 20,
    rowKey: 'id',
    showIndex: false,
    showExport: true,
    showPagination: true,
    selectable: false,
    maxHeight: undefined,
  },
)

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'selection-change', rows: TableRow[]): void
}>()

const totalText = computed(() =>
  props.showIndex ? `共 ${props.total || props.rows.length} 条` : `共 ${props.total || props.rows.length} 条`,
)

function indexMethod(index: number): number {
  return (props.page - 1) * props.pageSize + index + 1
}

function tagOf(col: TableColumn, value: unknown): TagType {
  const key = String(value ?? '')
  return col.tagMap?.[key]?.type ?? 'info'
}

function tagText(col: TableColumn, value: unknown): string {
  const key = String(value ?? '')
  return col.tagMap?.[key]?.text ?? key
}

function onPageChange(page: number): void {
  emit('update:page', page)
}

function onSelectionChange(rows: TableRow[]): void {
  emit('selection-change', rows)
}

function onExport(): void {
  ElMessage.success(`已生成导出文件：${props.title}.xlsx（演示模式，未真实下载）`)
}
</script>

<style scoped>
.panel-head--inset {
  padding: 16px 20px 0;
  margin-bottom: 12px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-tag {
  display: inline-flex;
}
</style>
