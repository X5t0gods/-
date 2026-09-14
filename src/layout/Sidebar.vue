<template>
  <aside class="app-sidebar">
    <div class="brand">
      <div class="brand-logo">
        <el-icon :size="20"><ShoppingBag /></el-icon>
      </div>
      <div class="brand-text">
        <div class="brand-title">社区超市管理系统</div>
        <div class="brand-sub">COMMUNITY MARKET</div>
      </div>
    </div>

    <nav class="sidebar-menu">
      <div v-for="group in visibleGroups" :key="group.title" class="menu-group">
        <div class="menu-group-title">{{ group.title }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ 'is-active': isActive(item.path) }"
        >
          <el-icon class="menu-icon"><component :is="item.icon" /></el-icon>
          <span class="menu-text">{{ item.title }}</span>
        </router-link>
      </div>
    </nav>

    <div class="store-card">
      <div class="store-name">阳光社区超市</div>
      <div class="store-status">
        <i class="dot"></i>
        旗舰店 · 营业中
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MENU_GROUPS } from '@/router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

/** 仅展示当前角色有权访问的菜单（真正的权限校验以服务端为准） */
const visibleGroups = computed(() =>
  MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.some((r) => userStore.roles.includes(r))),
  })).filter((group) => group.items.length > 0),
)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  padding: 0 18px;
  flex: 0 0 64px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #ffffff;
  color: var(--brand-7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
}

.brand-title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.brand-sub {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.42);
  letter-spacing: 1.2px;
  margin-top: 2px;
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  padding: 12px 10px;
}

.sidebar-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
}

.menu-group + .menu-group {
  margin-top: 14px;
}

.menu-group-title {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.36);
  padding: 6px 10px;
  letter-spacing: 0.6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border-radius: 6px;
  color: var(--sidebar-text);
  font-size: 13.5px;
  transition: background 0.16s ease, color 0.16s ease;
}

.menu-item:hover {
  background: var(--sidebar-bg-hover);
  color: #ffffff;
}

.menu-item.is-active {
  background: var(--brand-7);
  color: #ffffff;
  font-weight: 500;
}

.menu-icon {
  font-size: 16px;
}

.store-card {
  margin: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  flex: 0 0 auto;
}

.store-name {
  font-size: 13px;
  color: #ffffff;
  font-weight: 500;
}

.store-status {
  margin-top: 5px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2ba471;
  display: inline-block;
}
</style>
