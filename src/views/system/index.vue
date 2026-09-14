<template>
  <div>
    <div class="stat-row">
      <StatCard v-for="s in stats" :key="s.label" :item="s" />
    </div>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <!-- 用户管理 -->
        <el-tab-pane label="用户管理" name="user">
          <div class="filter-bar filter-bar--inner">
            <el-input v-model="keyword" placeholder="账号 / 姓名" clearable style="width: 220px" />
            <el-select v-model="roleFilter" placeholder="全部角色" clearable style="width: 160px">
              <el-option v-for="r in ROLE_NAMES" :key="r" :label="r" :value="r" />
            </el-select>
            <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width: 140px">
              <el-option label="启用" value="on" />
              <el-option label="已停用" value="off" />
            </el-select>
            <el-button plain @click="resetQuery">重置</el-button>
            <el-button type="primary" :icon="Search">查询</el-button>
          </div>

          <DataPanel
            title="用户列表"
            :subtitle="`共 ${filteredUsers.length} 位用户`"
            :columns="userColumns"
            :rows="usersWithRoleText"
            :show-pagination="false"
          >
            <template #actions>
              <el-button plain @click="msg('已导出用户名单')">导出目录</el-button>
              <el-button plain @click="msg('已批量停用选中账号（演示）')">批量停用</el-button>
              <el-button type="primary" :icon="Plus" @click="openUserDialog">新增用户</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>

        <!-- 角色权限 -->
        <el-tab-pane label="角色权限" name="role">
          <el-row :gutter="16">
            <el-col :xs="24" :md="7">
              <section class="panel">
                <div class="panel-head">
                  <div class="panel-title">角色列表</div>
                </div>
                <ul class="role-list">
                  <li
                    v-for="r in roles"
                    :key="r.code"
                    :class="{ 'is-active': currentRole === r.code }"
                    @click="currentRole = r.code"
                  >
                    <span class="role-name">{{ r.name }}</span>
                    <span class="role-count">{{ r.permissions.length }} 项权限</span>
                  </li>
                </ul>
              </section>
            </el-col>
            <el-col :xs="24" :md="17">
              <section class="panel">
                <div class="panel-head">
                  <div class="panel-title">
                    {{ currentRoleName }} · 权限配置
                    <small>权限校验在服务端强制执行，前端隐藏菜单仅作体验优化</small>
                  </div>
                  <el-button type="primary" size="small" @click="msg('权限已保存并即时生效')">保存权限</el-button>
                </div>
                <el-checkbox-group v-model="checkedPermissions">
                  <div v-for="group in PERMISSION_GROUPS" :key="group.module" class="perm-group">
                    <div class="perm-group-head">
                      <el-checkbox
                        :model-value="isAllChecked(group.items)"
                        :indeterminate="isIndeterminate(group.items)"
                        @change="(v: boolean | string | number) => toggleGroup(group.items, Boolean(v))"
                      >
                        {{ group.moduleName }}
                      </el-checkbox>
                    </div>
                    <div class="perm-items">
                      <el-checkbox v-for="p in group.items" :key="p.code" :value="p.code">
                        {{ p.name }}
                      </el-checkbox>
                    </div>
                  </div>
                </el-checkbox-group>
              </section>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 操作日志 -->
        <el-tab-pane label="操作日志" name="log">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="调价、作废、退款、库存调整、权限变更五类关键操作全部留痕，记录操作人、时间与变更前后值。"
            class="alert-gap"
          />
          <DataPanel
            title="操作日志"
            :columns="logColumns"
            :rows="logs as unknown as Record<string, string | number>[]"
            :total="logs.length"
            :page="1"
          />
        </el-tab-pane>

        <!-- 参数配置 -->
        <el-tab-pane label="参数配置" name="config">
          <el-form :model="configForm" label-width="150px" class="config-form">
            <template v-for="group in CONFIG_GROUPS" :key="group.key">
              <el-divider content-position="left">{{ group.name }}</el-divider>
              <el-row :gutter="24">
                <el-col v-for="item in itemsOf(group.key)" :key="item.key" :span="12">
                  <el-form-item :label="item.label">
                    <el-input v-if="item.type === 'text'" v-model="configForm[item.key]" />
                    <el-input-number
                      v-else-if="item.type === 'number'"
                      v-model="configFormNumber[item.key]"
                      :min="0"
                      :precision="['point_rate', 'max_discount'].includes(item.key) ? 2 : 0"
                      style="width: 100%"
                    />
                    <el-switch v-else-if="item.type === 'switch'" v-model="configFormBool[item.key]" />
                    <el-input v-else v-model="configForm[item.key]" type="textarea" :rows="2" />
                    <div class="config-desc">{{ item.description }}</div>
                  </el-form-item>
                </el-col>
              </el-row>
            </template>

            <el-form-item>
              <el-button @click="onResetConfig">恢复默认</el-button>
              <el-button type="primary" @click="msg('参数已保存并即时生效')">保存配置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <!-- 数据备份 -->
        <el-tab-pane label="数据备份" name="backup">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="每日凌晨 02:00 自动全量备份，保留最近 30 份；恢复前会自动对当前数据做保护性备份。"
            class="alert-gap"
          />
          <DataPanel
            title="备份记录"
            subtitle="支持下载与恢复操作"
            :columns="backupColumns"
            :rows="backupRecords as unknown as Record<string, string | number>[]"
            :total="backupRecords.length"
            :page="1"
          >
            <template #actions>
              <el-button plain @click="msg('备份文件已下载')">下载选中</el-button>
              <el-button type="primary" @click="onManualBackup">手动备份</el-button>
            </template>
          </DataPanel>
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- 新增用户 -->
    <el-dialog v-model="userDialogVisible" title="新增用户" width="520px">
      <el-form :model="userForm" label-width="92px">
        <el-form-item label="登录账号" required>
          <el-input v-model="userForm.username" placeholder="字母 / 数字 / 下划线" />
        </el-form-item>
        <el-form-item label="真实姓名" required>
          <el-input v-model="userForm.realName" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        <el-form-item label="所属角色" required>
          <el-select v-model="userForm.roles" multiple style="width: 100%" placeholder="可多选">
            <el-option v-for="r in ROLE_NAMES" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="userForm.password" placeholder="默认 123456" />
        </el-form-item>
        <el-form-item label="账号状态">
          <el-radio-group v-model="userForm.status">
            <el-radio value="on">启用</el-radio>
            <el-radio value="off">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import StatCard from '@/components/StatCard.vue'
import DataPanel from '@/components/DataPanel.vue'
import type { StatItem, TableColumn } from '@/types'
import { CONFIG_ITEMS, logList, userList } from '@/utils/mock'
import { formatDateTime } from '@/utils/format'

const activeTab = ref('user')

/** 指标由用户与日志数据集推导（computed 延迟求值，避免引用下方常量时尚未初始化） */
const stats = computed<StatItem[]>(() => [
  {
    label: '系统用户数',
    value: users.length,
    delta: `启用 ${users.filter((u) => u.status === 'on').length} 位`,
    deltaType: 'up',
  },
  { label: '角色数量', value: ROLE_NAMES.length, delta: '系统预置角色', deltaType: 'up' },
  { label: '操作日志', value: logs.length, delta: '关键操作全部留痕', deltaType: 'up' },
  { label: '最近备份时间', value: '02:00', delta: '每日自动全量备份', deltaType: 'up' },
])

/* ---------------- 用户管理 ---------------- */
const ROLE_NAMES = ['店主', '收银员', '库管员', '采购员', '系统管理员']
const users = userList()

const keyword = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

const filteredUsers = computed(() =>
  users.filter((u) => {
    if (keyword.value && !u.username.includes(keyword.value) && !u.realName.includes(keyword.value)) return false
    if (roleFilter.value && !u.roles.includes(roleFilter.value)) return false
    if (statusFilter.value && u.status !== statusFilter.value) return false
    return true
  }),
)

const userColumns: TableColumn[] = [
  { prop: 'username', label: '用户账号', width: 150 },
  { prop: 'realName', label: '姓名', width: 110 },
  { prop: 'roleText', label: '角色', minWidth: 160 },
  { prop: 'phone', label: '手机号', width: 140 },
  { prop: 'lastLoginAt', label: '最近登录', width: 180 },
  {
    prop: 'status',
    label: '账号状态',
    width: 110,
    align: 'center',
    render: 'tag',
    tagMap: {
      on: { text: '启用', type: 'success' },
      off: { text: '已停用', type: 'info' },
    },
  },
]

const usersWithRoleText = computed(() =>
  filteredUsers.value.map((u) => ({ ...u, roleText: u.roles.join(' / ') })) as unknown as Record<
    string,
    string | number
  >[],
)

function resetQuery(): void {
  keyword.value = ''
  roleFilter.value = ''
  statusFilter.value = ''
}

const userDialogVisible = ref(false)
const userForm = reactive({ username: '', realName: '', phone: '', roles: [] as string[], password: '123456', status: 'on' })

function openUserDialog(): void {
  userDialogVisible.value = true
}

function submitUser(): void {
  if (!userForm.username || !userForm.realName || userForm.roles.length === 0) {
    ElMessage.warning('请填写登录账号、真实姓名与所属角色')
    return
  }
  userDialogVisible.value = false
  ElMessage.success(`用户「${userForm.realName}」已创建`)
}

/* ---------------- 角色权限 ---------------- */
const PERMISSION_GROUPS = [
  {
    module: 'PRD',
    moduleName: '商品管理',
    items: [
      { code: 'prd.product.view', name: '商品查询' },
      { code: 'prd.product.edit', name: '商品新增/修改' },
      { code: 'prd.product.price', name: '商品调价' },
      { code: 'prd.category.edit', name: '分类维护' },
    ],
  },
  {
    module: 'INV',
    moduleName: '库存管理',
    items: [
      { code: 'inv.stock.view', name: '库存查询' },
      { code: 'inv.stock.adjust', name: '库存调整/报损' },
      { code: 'inv.stocktaking.exec', name: '盘点执行' },
      { code: 'inv.stocktaking.confirm', name: '盘点确认' },
    ],
  },
  {
    module: 'PUR',
    moduleName: '采购管理',
    items: [
      { code: 'pur.order.create', name: '采购下单' },
      { code: 'pur.receipt.in', name: '到货入库' },
      { code: 'pur.supplier.edit', name: '供应商维护' },
    ],
  },
  {
    module: 'SAL',
    moduleName: '销售收银',
    items: [
      { code: 'sal.trade.settle', name: '收银结算' },
      { code: 'sal.trade.refund', name: '退货办理' },
      { code: 'sal.trade.void', name: '交易作废' },
      { code: 'sal.session.manage', name: '交班对账' },
    ],
  },
  {
    module: 'MEM',
    moduleName: '会员与促销',
    items: [
      { code: 'mem.member.edit', name: '会员管理' },
      { code: 'mem.balance.adjust', name: '储值调整' },
      { code: 'pro.activity.edit', name: '促销配置' },
    ],
  },
  {
    module: 'RPT',
    moduleName: '统计报表',
    items: [
      { code: 'rpt.report.view', name: '报表查看' },
      { code: 'rpt.report.own', name: '仅本人数据' },
      { code: 'rpt.report.export', name: '报表导出' },
    ],
  },
  {
    module: 'SYS',
    moduleName: '系统管理',
    items: [
      { code: 'sys.user.manage', name: '用户与角色管理' },
      { code: 'sys.log.view', name: '操作日志查看' },
      { code: 'sys.config.edit', name: '参数配置' },
      { code: 'sys.backup.manage', name: '数据备份与恢复' },
    ],
  },
]

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.code))

const roles = [
  { code: 'owner', name: '店主', permissions: ALL_PERMS },
  {
    code: 'cashier',
    name: '收银员',
    permissions: ['prd.product.view', 'inv.stock.view', 'sal.trade.settle', 'sal.trade.refund', 'sal.session.manage', 'mem.member.edit', 'rpt.report.own'],
  },
  {
    code: 'stock',
    name: '库管员',
    permissions: ['prd.product.view', 'prd.product.edit', 'inv.stock.view', 'inv.stock.adjust', 'inv.stocktaking.exec', 'pur.receipt.in', 'rpt.report.view'],
  },
  {
    code: 'buyer',
    name: '采购员',
    permissions: ['prd.product.view', 'inv.stock.view', 'pur.order.create', 'pur.receipt.in', 'pur.supplier.edit', 'rpt.report.view'],
  },
  {
    code: 'admin',
    name: '系统管理员',
    permissions: ['sys.user.manage', 'sys.log.view', 'sys.config.edit', 'sys.backup.manage'],
  },
]

const currentRole = ref('owner')
const currentRoleName = computed(() => roles.find((r) => r.code === currentRole.value)?.name ?? '')
const checkedPermissions = ref<string[]>(roles[0]!.permissions)

// 切换角色时同步权限勾选
watch(currentRole, (code) => {
  checkedPermissions.value = [...(roles.find((r) => r.code === code)?.permissions ?? [])]
})

function isAllChecked(items: Array<{ code: string; name: string }>): boolean {
  return items.every((i) => checkedPermissions.value.includes(i.code))
}

function isIndeterminate(items: Array<{ code: string; name: string }>): boolean {
  const hit = items.filter((i) => checkedPermissions.value.includes(i.code)).length
  return hit > 0 && hit < items.length
}

function toggleGroup(items: Array<{ code: string; name: string }>, checked: boolean): void {
  const codes = items.map((i) => i.code)
  if (checked) {
    checkedPermissions.value = Array.from(new Set([...checkedPermissions.value, ...codes]))
  } else {
    checkedPermissions.value = checkedPermissions.value.filter((c) => !codes.includes(c))
  }
}

/* ---------------- 操作日志 ---------------- */
const logs = logList(60)

const logColumns: TableColumn[] = [
  { prop: 'username', label: '操作人账号', width: 140 },
  { prop: 'realName', label: '姓名', width: 100 },
  { prop: 'moduleName', label: '模块', width: 110, align: 'center' },
  { prop: 'action', label: '操作类型', width: 140 },
  { prop: 'target', label: '目标对象', width: 110 },
  { prop: 'beforeValue', label: '变更前', width: 110 },
  { prop: 'afterValue', label: '变更后', width: 110 },
  { prop: 'ip', label: 'IP 地址', width: 140 },
  { prop: 'createdAt', label: '操作时间', width: 180 },
]

/* ---------------- 参数配置 ---------------- */
const CONFIG_GROUPS = [
  { key: 'store', name: '门店信息' },
  { key: 'print', name: '小票打印' },
  { key: 'stock', name: '库存与预警' },
  { key: 'member', name: '会员与积分' },
  { key: 'system', name: '收银与系统' },
]

const configForm = reactive<Record<string, string>>({})
const configFormNumber = reactive<Record<string, number>>({})
const configFormBool = reactive<Record<string, boolean>>({})

function initConfig(): void {
  CONFIG_ITEMS.forEach((item) => {
    if (item.type === 'number') {
      // 修复浮点精度问题：对小数进行四舍五入处理
      const numVal = Number(item.value)
      configFormNumber[item.key] = Number.isInteger(numVal) ? numVal : Math.round(numVal * 100) / 100
    } else if (item.type === 'switch') {
      configFormBool[item.key] = item.value === 'true'
    } else {
      configForm[item.key] = item.value
    }
  })
}
initConfig()

function itemsOf(group: string) {
  return CONFIG_ITEMS.filter((i) => i.group === group)
}

function onResetConfig(): void {
  initConfig()
  ElMessage.success('已恢复默认参数')
}


/* ---------------- 数据备份 ---------------- */
const backupRecords = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  fileName: `backup_${formatDateTime(new Date(Date.now() - i * 86400_000)).replace(/[:\s]/g, '_')}.sql`,
  fileSize: `${(Math.random() * 50 + 10).toFixed(1)} MB`,
  backupType: i % 5 === 0 ? '手动' : '自动',
  status: i === 2 ? 'failed' : 'success',
  createdAt: formatDateTime(new Date(Date.now() - i * 86400_000)),
}))

const backupColumns: TableColumn[] = [
  { prop: 'fileName', label: '备份文件', minWidth: 240 },
  { prop: 'fileSize', label: '文件大小', width: 110, align: 'right' },
  { prop: 'backupType', label: '备份类型', width: 100, align: 'center' },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    align: 'center',
    render: 'tag',
    tagMap: {
      success: { text: '成功', type: 'success' },
      failed: { text: '失败', type: 'danger' },
    },
  },
  { prop: 'createdAt', label: '备份时间', width: 180 },
]

function onManualBackup(): void {
  ElMessageBox.confirm('确认立即执行数据备份？', '手动备份', {
    confirmButtonText: '确认备份',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => ElMessage.success('数据备份已启动，完成后将显示在列表中'))
    .catch(() => undefined)
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

.role-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.role-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.16s ease;
}

.role-list li:hover {
  background: var(--gray-1);
}

.role-list li.is-active {
  background: var(--brand-1);
}

.role-list li.is-active .role-name {
  color: var(--brand-7);
  font-weight: 600;
}

.role-name {
  font-size: 13.5px;
}

.role-count {
  font-size: 12px;
  color: var(--text-placeholder);
}

.perm-group {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-color);
}

.perm-group:last-child {
  border-bottom: none;
}

.perm-group-head {
  margin-bottom: 6px;
}

.perm-group-head :deep(.el-checkbox__label) {
  font-weight: 600;
  color: var(--text-primary);
}

.perm-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  padding-left: 22px;
}

.config-form {
  max-width: 1040px;
}

.config-desc {
  font-size: 12px;
  color: var(--text-placeholder);
  line-height: 1.5;
  margin-top: 2px;
}
</style>
