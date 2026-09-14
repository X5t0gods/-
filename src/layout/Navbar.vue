<template>
  <header class="app-navbar">
    <div class="nav-left">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <span class="page-breadcrumb">{{ currentDate }}</span>
    </div>

    <div class="nav-right">
      <el-input
        v-model="keyword"
        class="nav-search"
        placeholder="搜索商品 / 会员 / 订单"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-badge :value="3" :offset="[-2, 4]">
        <el-icon class="nav-icon"><Bell /></el-icon>
      </el-badge>

      <el-dropdown trigger="click" @command="onCommand">
        <div class="user-box">
          <el-avatar :size="32" class="user-avatar">{{ avatarText }}</el-avatar>
          <div class="user-info">
            <div class="user-name">{{ userStore.displayName || '未登录' }}</div>
            <div class="user-role">{{ userStore.primaryRole }}</div>
          </div>
          <el-icon class="arrow"><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人中心</el-dropdown-item>
            <el-dropdown-item command="about">关于系统</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { formatDate, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const pageTitle = computed(() => (route.meta.title as string) || '社区超市销售管理系统')
const currentDate = computed(() => formatDateTime(new Date()))
const avatarText = computed(() => (userStore.displayName || '未').slice(0, 1))

async function onCommand(command: string): Promise<void> {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出当前账号吗？', '退出登录', {
        type: 'warning',
        confirmButtonText: '退出',
        cancelButtonText: '取消',
      })
      userStore.logout()
      ElMessage.success('已退出登录')
      router.push('/login')
    } catch {
      /* 用户取消 */
    }
    return
  }
  if (command === 'profile') {
    ElMessage.info(`当前账号：${userStore.user?.username ?? '-'}｜角色：${userStore.roles.join('、') || '-'}`)
    return
  }
  ElMessage.info(`社区超市销售管理系统 v1.0｜${formatDate(new Date())}`)
}
</script>

<style scoped>
.app-navbar {
  height: 64px;
  flex: 0 0 64px;
  background: #ffffff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.nav-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.page-breadcrumb {
  font-size: 12px;
  color: var(--text-placeholder);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.nav-search {
  width: 240px;
}

.nav-icon {
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
}

.nav-icon:hover {
  color: var(--brand-7);
}

.user-box {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.16s ease;
}

.user-box:hover {
  background: var(--gray-1);
}

.user-avatar {
  background: var(--brand-7);
  font-size: 13px;
}

.user-info {
  line-height: 1.25;
}

.user-name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.user-role {
  font-size: 11px;
  color: var(--text-placeholder);
}

.arrow {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
