import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ACCOUNTS } from '@/utils/mock'

export interface CurrentUser {
  username: string
  realName: string
  roles: string[]
  loginAt: string
}

/** 登录失败策略（对应《详细功能需求文档》FR-SYS-01 业务规则） */
const MAX_FAIL = 5
const LOCK_MINUTES = 15

const STORAGE_KEY = 'csm-admin-user'
const FAIL_KEY = 'csm-login-fail'

interface FailRecord {
  count: number
  lockedUntil: number
}

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

function readFailMap(): Record<string, FailRecord> {
  try {
    const raw = localStorage.getItem(FAIL_KEY)
    return raw ? (JSON.parse(raw) as Record<string, FailRecord>) : {}
  } catch {
    return {}
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<CurrentUser | null>(readStoredUser())
  const failMap = ref<Record<string, FailRecord>>(readFailMap())

  const isLogged = computed(() => !!user.value)
  const roles = computed<string[]>(() => user.value?.roles ?? [])
  const primaryRole = computed(() => roles.value[0] ?? '')
  const displayName = computed(() => user.value?.realName ?? '')

  function persistFail(): void {
    localStorage.setItem(FAIL_KEY, JSON.stringify(failMap.value))
  }

  /** 某账号是否处于锁定期 */
  function lockRemainMinutes(username: string): number {
    const rec = failMap.value[username.trim()]
    if (!rec || rec.lockedUntil <= Date.now()) return 0
    return Math.ceil((rec.lockedUntil - Date.now()) / 60000)
  }

  /** 演示用登录：账号密码校验 + 连续失败锁定 */
  function login(username: string, password: string): { ok: boolean; message: string } {
    const name = username.trim()

    const remain = lockRemainMinutes(name)
    if (remain > 0) {
      return { ok: false, message: `账号已锁定，请 ${remain} 分钟后再试` }
    }

    const acc = ACCOUNTS.find((a) => a.username === name)
    if (!acc) {
      return { ok: false, message: '账号不存在，请核对后重试' }
    }

    if (acc.password !== password) {
      const count = (failMap.value[name]?.count ?? 0) + 1
      const locked = count >= MAX_FAIL
      failMap.value[name] = {
        count: locked ? 0 : count,
        lockedUntil: locked ? Date.now() + LOCK_MINUTES * 60_000 : 0,
      }
      persistFail()
      return {
        ok: false,
        message: locked
          ? `密码连续错误 ${MAX_FAIL} 次，账号已锁定 ${LOCK_MINUTES} 分钟`
          : `密码错误，还可尝试 ${MAX_FAIL - count} 次`,
      }
    }

    // 登录成功：清除失败记录
    if (failMap.value[name]) {
      delete failMap.value[name]
      persistFail()
    }

    user.value = {
      username: acc.username,
      realName: acc.realName,
      roles: acc.roles,
      loginAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
    return { ok: true, message: '登录成功' }
  }

  function logout(): void {
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function hasRole(...codes: string[]): boolean {
    return roles.value.some((r) => codes.includes(r))
  }

  return {
    user,
    isLogged,
    roles,
    primaryRole,
    displayName,
    login,
    logout,
    hasRole,
    lockRemainMinutes,
  }
})
