/** 格式化工具 */

/** 金额：1234.5 -> 1,234.50 */
export function formatMoney(value: number | string | null | undefined, digits = 2): string {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return '0.00'
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** 带货币符号 */
export function money(value: number | string | null | undefined, digits = 2): string {
  return `¥${formatMoney(value, digits)}`
}

/** 千分位整数 */
export function formatInt(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  if (Number.isNaN(n)) return '0'
  return n.toLocaleString('zh-CN')
}

/** 百分比 */
export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

/** 日期时间：2026-09-14 15:32:08 */
export function formatDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  )
}

/** 日期：2026-09-14 */
export function formatDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

/** 手机号脱敏：13812345678 -> 138****5678 */
export function maskPhone(phone: string): string {
  if (phone.length !== 11) return phone
  return `${phone.slice(0, 3)}****${phone.slice(7)}`
}

/** 相对今天偏移 n 天的日期 */
export function dayOffset(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}
