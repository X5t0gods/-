import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

/** 系统角色（与登录账号的 roles 保持一致） */
export const ROLE_OWNER = '店主'
export const ROLE_CASHIER = '收银员'
export const ROLE_STOCK = '库管员'
export const ROLE_BUYER = '采购员'
export const ROLE_ADMIN = '系统管理员'

export interface MenuItem {
  path: string
  title: string
  /** Element Plus 图标组件名 */
  icon: string
  /** 可见角色；为空表示全部角色可见 */
  roles?: string[]
}

export interface MenuGroup {
  title: string
  items: MenuItem[]
}

/**
 * 侧边栏菜单（与路由一一对应，来源：管理端 UI 原型导航结构）
 * roles 依据《详细功能需求文档》2.4 角色与权限模型的权限矩阵设定：
 * 仅为体验优化（前端隐藏入口），真正的权限校验必须在服务端强制执行。
 */
export const MENU_GROUPS: MenuGroup[] = [
  {
    title: '概览',
    items: [{ path: '/dashboard', title: '经营看板', icon: 'DataBoard' }],
  },
  {
    title: '业务管理',
    items: [
      { path: '/product', title: '商品管理', icon: 'Goods', roles: [ROLE_OWNER, ROLE_STOCK] },
      { path: '/inventory', title: '库存管理', icon: 'Box', roles: [ROLE_OWNER, ROLE_STOCK, ROLE_BUYER] },
      { path: '/purchase', title: '采购管理', icon: 'ShoppingCart', roles: [ROLE_OWNER, ROLE_BUYER] },
      { path: '/sales', title: '销售收银', icon: 'Money', roles: [ROLE_OWNER, ROLE_CASHIER] },
      { path: '/member', title: '会员管理', icon: 'User', roles: [ROLE_OWNER, ROLE_CASHIER] },
      { path: '/promotion', title: '促销管理', icon: 'Discount', roles: [ROLE_OWNER] },
    ],
  },
  {
    title: '数据与设置',
    items: [
      { path: '/report', title: '统计报表', icon: 'TrendCharts', roles: [ROLE_OWNER, ROLE_STOCK, ROLE_BUYER, ROLE_ADMIN] },
      { path: '/system', title: '系统管理', icon: 'Setting', roles: [ROLE_OWNER, ROLE_ADMIN] },
    ],
  },
]

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '经营看板' },
      },
      {
        path: 'product',
        name: 'Product',
        component: () => import('@/views/product/index.vue'),
        meta: { title: '商品管理', roles: [ROLE_OWNER, ROLE_STOCK] },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/index.vue'),
        meta: { title: '库存管理', roles: [ROLE_OWNER, ROLE_STOCK, ROLE_BUYER] },
      },
      {
        path: 'purchase',
        name: 'Purchase',
        component: () => import('@/views/purchase/index.vue'),
        meta: { title: '采购管理', roles: [ROLE_OWNER, ROLE_BUYER] },
      },
      {
        path: 'sales',
        name: 'Sales',
        component: () => import('@/views/sales/index.vue'),
        meta: { title: '销售收银', roles: [ROLE_OWNER, ROLE_CASHIER] },
      },
      {
        path: 'member',
        name: 'Member',
        component: () => import('@/views/member/index.vue'),
        meta: { title: '会员管理', roles: [ROLE_OWNER, ROLE_CASHIER] },
      },
      {
        path: 'promotion',
        name: 'Promotion',
        component: () => import('@/views/promotion/index.vue'),
        meta: { title: '促销管理', roles: [ROLE_OWNER] },
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/views/report/index.vue'),
        meta: { title: '统计报表', roles: [ROLE_OWNER, ROLE_STOCK, ROLE_BUYER, ROLE_ADMIN] },
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('@/views/system/index.vue'),
        meta: { title: '系统管理', roles: [ROLE_OWNER, ROLE_ADMIN] },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/** 该用户是否有权访问某个已授权的功能（不传 roles 视为全员可见） */
export function canAccess(roles: string[] | undefined, userRoles: string[]): boolean {
  if (!roles || roles.length === 0) return true
  return userRoles.some((r) => roles.includes(r))
}

router.beforeEach((to) => {
  const user = useUserStore()

  if (to.meta.public === true) {
    // 已登录用户访问登录页则直接进入首页
    return user.isLogged && to.path === '/login' ? { path: '/dashboard' } : true
  }

  if (!user.isLogged) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 角色越权校验：直接输入 URL 访问未授权功能时拦截
  const required = to.meta.roles as string[] | undefined
  if (!canAccess(required, user.roles)) {
    ElMessage.warning('当前角色无权访问该功能，请联系店长调整权限')
    return { path: '/dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = (to.meta.title as string) || ''
  document.title = title ? `${title} · 社区超市销售管理系统` : '社区超市销售管理系统'
})

export default router
