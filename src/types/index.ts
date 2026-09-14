/** 通用类型定义 */

export type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

export interface TagMeta {
  text: string
  type: TagType
}

/** 统计卡片数据 */
export interface StatItem {
  label: string
  value: string | number
  /** 环比说明，如「较昨日 +8.3%」 */
  delta?: string
  /** 环比方向：up 上升（绿/红按业务语义） down 下降 */
  deltaType?: 'up' | 'down'
}

/** 表格列定义（配置化驱动通用表格） */
export interface TableColumn {
  prop: string
  label: string
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  /** 渲染方式：text 纯文本 / money 金额 / num 数字 / tag 状态标签 / date 日期时间 */
  render?: 'text' | 'money' | 'num' | 'tag' | 'date'
  /** render = tag 时的取值映射 */
  tagMap?: Record<string, TagMeta>
  /** 是否可排序（前端排序） */
  sortable?: boolean
}

export type TableRow = Record<string, string | number | boolean | null | undefined>

/** 商品 */
export interface Product {
  id: number
  name: string
  barcode: string
  category: string
  spec: string
  unit: string
  purchasePrice: number
  salePrice: number
  stock: number
  safeStock: number
  status: 'on' | 'low' | 'out' | 'off'
}

/** 菜单项 */
export interface MenuItem {
  path: string
  title: string
  icon: string
  /** 允许访问的角色编码，为空表示全部角色可见 */
  roles?: string[]
}
