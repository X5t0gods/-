/**
 * 前端演示数据（Mock）
 *
 * ⚠️ 数据一致性约定（重要）：
 * 1. 每个数据集使用「独立种子」的随机数生成器，且只生成一次并缓存（见 once()）；
 *    这样任意页面、任意时刻调用同一函数，拿到的都是同一份数据，不会出现
 *    「商品管理页库存 220、库存管理页库存 131」这类自相矛盾。
 * 2. xxxList(count) 返回的是同一基础数据集的前缀切片，count 只决定截取长度。
 * 3. 统计数字一律由真实数据集推导（xxxStats），不再硬编码，保证「卡片数字」与「列表内容」对得上。
 *
 * 后续对接 Django 后端时，把各视图的数据来源替换为 API 请求即可；本文件可直接删除。
 */
import { dayOffset, formatDate, formatDateTime } from './format'

/* ------------------------------ 随机数与缓存 ------------------------------ */

/** 独立种子的伪随机生成器（线性同余），保证可复现 */
function createRng(seed: number) {
  let s = seed % 233280
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const cache = new Map<string, unknown>()

/** 同一 key 只构建一次，之后直接复用 */
function once<T>(key: string, build: () => T): T {
  if (!cache.has(key)) cache.set(key, build())
  return cache.get(key) as T
}

/** 基于某个种子的取值工具集 */
function rngTools(seed: number) {
  const rnd = createRng(seed)
  return {
    rnd,
    int: (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T,
    money2: (min: number, max: number) => Math.round((min + rnd() * (max - min)) * 100) / 100,
  }
}

/* ------------------------------ 分类 ------------------------------ */

export const CATEGORIES = ['饮料', '零食', '粮油', '日用', '生鲜', '方便食品'] as const

export interface CategoryNode {
  id: number
  name: string
  code: string
  productCount: number
  sort: number
}

const CATEGORY_CODES = ['DRINK', 'SNACK', 'GRAIN', 'DAILY', 'FRESH', 'INSTANT']

/* ------------------------------ 商品 ------------------------------ */

export interface ProductRow {
  id: number
  barcode: string
  name: string
  spec: string
  unit: string
  category: string
  purchasePrice: number
  salePrice: number
  memberPrice: number | null
  stock: number
  safeStock: number
  shelfLifeDays: number | null
  status: 'on' | 'low' | 'out' | 'off'
  supplier: string
  updatedAt: string
}

const PRODUCT_SEEDS: Array<[string, string, string, string, number, number]> = [
  ['伊利纯牛奶 250ml×12', '饮料', '250ml×12', '箱', 42.0, 52.8],
  ['农夫山泉饮用天然水 550ml×24', '饮料', '550ml×24', '箱', 28.5, 36.0],
  ['乐事薯片 原味 70g', '零食', '70g', '袋', 4.6, 6.5],
  ['五常大米 稻花香 5kg', '粮油', '5kg', '袋', 45.0, 59.9],
  ['蓝月亮 深层洁净护理洗衣液 3kg', '日用', '3kg', '瓶', 31.0, 39.9],
  ['康师傅红烧牛肉面 5 连包', '方便食品', '5 连包', '组', 19.5, 24.5],
  ['蒙牛特仑苏纯牛奶 250ml×12', '饮料', '250ml×12', '箱', 58.0, 69.9],
  ['可口可乐 330ml×24', '饮料', '330ml×24', '箱', 46.0, 56.0],
  ['旺旺雪饼 84g', '零食', '84g', '袋', 5.2, 7.5],
  ['金龙鱼调和油 5L', '粮油', '5L', '桶', 62.0, 79.9],
  ['心相印抽纸 3 层 120 抽', '日用', '120 抽×3', '提', 12.0, 16.9],
  ['六神花露水 195ml', '日用', '195ml', '瓶', 13.5, 18.5],
  ['光明莫斯利安酸奶 200g×12', '饮料', '200g×12', '箱', 49.0, 62.0],
  ['三只松鼠每日坚果 750g', '零食', '750g', '盒', 68.0, 89.0],
  ['娃哈哈 AD 钙奶 220g×24', '饮料', '220g×24', '箱', 39.0, 48.0],
  ['海天生抽酱油 1.9L', '粮油', '1.9L', '瓶', 18.0, 24.5],
  ['雕牌洗洁精 1.5kg', '日用', '1.5kg', '瓶', 11.5, 15.9],
  ['本地小白菜（散装）', '生鲜', '散装', '斤', 2.4, 3.98],
  ['鸡蛋（散装）', '生鲜', '散装', '斤', 5.2, 6.58],
  ['五花肉（冷鲜）', '生鲜', '散装', '斤', 14.5, 19.8],
]

/** 库存预警商品（1 基序号）：6 个低库存 + 1 个缺货 = 7 项，与看板/库存页卡片数字对齐 */
const ALERT_INDEX: Record<number, 'low' | 'out'> = {
  13: 'low',
  57: 'low',
  101: 'low',
  205: 'low',
  311: 'low',
  402: 'low',
  508: 'out',
}

const PRODUCT_TOTAL = 1286

/** 商品基础数据集（唯一真源） */
const ALL_PRODUCTS = once('products', (): ProductRow[] => {
  const { int, money2 } = rngTools(20260914)
  const supplierNames = [
    '旺旺食品批发',
    '康师傅区域代理',
    '光明乳业经销',
    '华润万家供应链',
    '农夫山泉省代',
    '益海嘉里粮油',
    '雨润冷鲜肉配送',
    '宝洁日化代理',
  ]
  const rows: ProductRow[] = []
  for (let i = 0; i < PRODUCT_TOTAL; i++) {
    const seedRow = PRODUCT_SEEDS[i % PRODUCT_SEEDS.length]!
    const variant = Math.floor(i / PRODUCT_SEEDS.length)
    const [baseName, category, spec, unit, purchase, sale] = seedRow

    // —— 库存与状态：保证「停售约 11%、预警恰好 7 项」
    const alertType = ALERT_INDEX[i + 1]
    let stock = int(60, 320)
    let status: ProductRow['status'] = 'on'
    if (alertType === 'low') {
      stock = int(6, 18)
      status = 'low'
    } else if (alertType === 'out') {
      stock = 0
      status = 'out'
    } else if ((i + 1) % 9 === 0) {
      status = 'off'
    }

    const safeStock = [40, 50, 30, 20, 25, 30][i % 6]!

    rows.push({
      id: i + 1,
      barcode: String(6900000000000 + i * 137 + 12),
      name: variant === 0 ? baseName : `${baseName}（${variant + 1} 号规格）`,
      spec,
      unit,
      category,
      purchasePrice: Math.round(purchase * (1 + variant * 0.03) * 100) / 100,
      salePrice: Math.round(sale * (1 + variant * 0.03) * 100) / 100,
      memberPrice: i % 4 === 0 ? Math.round(sale * 0.95 * 100) / 100 : null,
      stock,
      safeStock,
      shelfLifeDays: category === '生鲜' ? 3 : category === '日用' ? null : [180, 365, 270][i % 3]!,
      status,
      supplier: supplierNames[i % supplierNames.length]!,
      updatedAt: formatDateTime(new Date(Date.now() - i * 3600_000)),
    })
  }
  // 价格再做一次微调，避免完全规律（仍使用同一种子，结果稳定）
  rows.forEach((r) => {
    r.purchasePrice = Math.round((r.purchasePrice + money2(0, 1.2)) * 100) / 100
  })
  return rows
})

/** 商品列表：返回统一数据集的前 count 条 */
export function productList(count = PRODUCT_TOTAL): ProductRow[] {
  return ALL_PRODUCTS.slice(0, Math.min(count, ALL_PRODUCTS.length))
}

/** 商品维度统计（卡片数字由此推导，保证与列表一致） */
export function productStats() {
  const all = ALL_PRODUCTS
  const off = all.filter((p) => p.status === 'off').length
  const low = all.filter((p) => p.status === 'low').length
  const out = all.filter((p) => p.status === 'out').length
  const stockAmount = all.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0)
  const rates = all.filter((p) => p.salePrice > 0).map((p) => (p.salePrice - p.purchasePrice) / p.salePrice)
  const avgGrossRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
  return {
    total: all.length,
    onSale: all.length - off,
    offSale: off,
    low,
    out,
    alert: low + out,
    stockAmount: Math.round(stockAmount * 100) / 100,
    /** 平均毛利率，供报表页「综合毛利率」使用 */
    avgGrossRate: Math.round(avgGrossRate * 10000) / 10000,
  }
}

/** 分类（商品数量由商品数据实时统计） */
export function categoryList(): CategoryNode[] {
  return once('categories', () =>
    CATEGORIES.map((name, i) => ({
      id: i + 1,
      name,
      code: CATEGORY_CODES[i]!,
      productCount: ALL_PRODUCTS.filter((p) => p.category === name).length,
      sort: i + 1,
    })),
  )
}

/* ------------------------------ 库存流水 ------------------------------ */

export interface StockFlowRow {
  id: number
  productName: string
  changeType: string
  changeQty: number
  afterQty: number
  refNo: string
  operator: string
  remark: string
  createdAt: string
}

export const CHANGE_TYPE_TEXT: Record<string, string> = {
  purchase_in: '采购入库',
  sale_out: '销售出库',
  return_in: '退货入库',
  loss_out: '报损出库',
  stocktake: '盘点调整',
  manual: '手工调整',
}

const ALL_FLOWS = once('stock-flows', (): StockFlowRow[] => {
  const { int, pick } = rngTools(20260915)
  const types = Object.keys(CHANGE_TYPE_TEXT)
  const operators = ['张建国', '李小美', '王海军', '徐店长']
  return Array.from({ length: 60 }, (_, i) => {
    const type = types[i % types.length]!
    const isIn = ['purchase_in', 'return_in'].includes(type)
    return {
      id: i + 1,
      productName: ALL_PRODUCTS[i * 17 % ALL_PRODUCTS.length]!.name,
      changeType: type,
      changeQty: (isIn ? 1 : -1) * int(2, 60),
      afterQty: int(50, 400),
      refNo: `${isIn ? 'RK' : 'S'}2026${String(914 - (i % 30)).padStart(4, '0')}${String(i + 1).padStart(3, '0')}`,
      operator: pick(operators),
      remark: type === 'manual' ? '货架整理发现差异' : '',
      createdAt: formatDateTime(new Date(Date.now() - i * 5400_000)),
    }
  })
})

export function stockFlowList(count = 60): StockFlowRow[] {
  return ALL_FLOWS.slice(0, count)
}

/* ------------------------------ 采购 ------------------------------ */

export interface SupplierRow {
  id: number
  code: string
  name: string
  contact: string
  phone: string
  mainCategory: string
  settleType: string
  status: 'on' | 'off'
  orderCount: number
}

const SUPPLIER_SEEDS: Array<[string, string, string, string, string]> = [
  ['旺旺食品批发', '张经理', '13801234567', '零食 / 方便食品', '月结 30 天'],
  ['康师傅区域代理', '李经理', '13902345678', '方便食品 / 饮料', '月结 15 天'],
  ['光明乳业经销', '王经理', '13703456789', '乳制品 / 饮料', '现结'],
  ['华润万家供应链', '赵经理', '13604567890', '日用百货', '月结 45 天'],
  ['农夫山泉省代', '陈经理', '13505678901', '饮用水 / 饮料', '现结'],
  ['益海嘉里粮油', '刘经理', '13406789012', '粮油', '月结 30 天'],
  ['雨润冷鲜肉配送', '孙经理', '13307890123', '生鲜', '周结'],
  ['宝洁日化代理', '周经理', '13208901234', '日用百货', '月结 30 天'],
  ['三只松鼠区域商', '吴经理', '13109012345', '零食', '现结'],
  ['本地蔬菜合作社', '郑经理', '13010123456', '生鲜', '周结'],
  ['蒙牛区域经销', '冯经理', '13811234567', '乳制品', '月结 30 天'],
  ['统一企业代理', '许经理', '13912345678', '饮料 / 方便食品', '月结 15 天'],
]

const ALL_SUPPLIERS = once('suppliers', (): SupplierRow[] => {
  const { int } = rngTools(20260916)
  return SUPPLIER_SEEDS.map((d, i) => ({
    id: i + 1,
    code: `SUP${String(i + 1).padStart(4, '0')}`,
    name: d[0],
    contact: d[1],
    phone: d[2],
    mainCategory: d[3],
    settleType: d[4],
    status: i === 10 ? 'off' : 'on',
    orderCount: int(3, 42),
  }))
})

export function supplierList(): SupplierRow[] {
  return ALL_SUPPLIERS
}

export interface PurchaseOrderRow {
  id: number
  orderNo: string
  supplier: string
  itemCount: number
  totalAmount: number
  status: 'draft' | 'ordered' | 'partly_received' | 'received' | 'cancelled'
  expectArriveDate: string
  creator: string
  createdAt: string
}

const ALL_PURCHASE_ORDERS = once('purchase-orders', (): PurchaseOrderRow[] => {
  const { int, money2, pick } = rngTools(20260917)
  const statuses: PurchaseOrderRow['status'][] = [
    'ordered',
    'received',
    'received',
    'cancelled',
    'received',
    'ordered',
    'partly_received',
    'draft',
  ]
  return Array.from({ length: 68 }, (_, i) => {
    const d = dayOffset(-(i % 40))
    return {
      id: i + 1,
      orderNo: `CG${formatDate(d).replace(/-/g, '')}${String((68 - i) % 1000).padStart(3, '0')}`,
      supplier: pick(ALL_SUPPLIERS).name,
      itemCount: int(3, 20),
      totalAmount: money2(600, 9800),
      status: statuses[i % statuses.length]!,
      expectArriveDate: formatDate(dayOffset(-(i % 40) + 3)),
      creator: i % 2 === 0 ? '王海军' : '徐店长',
      createdAt: formatDateTime(d),
    }
  })
})

export function purchaseOrderList(count = 68): PurchaseOrderRow[] {
  return ALL_PURCHASE_ORDERS.slice(0, count)
}

/** 采购维度统计 */
export function purchaseStats() {
  const orders = ALL_PURCHASE_ORDERS
  const monthPrefix = formatDate(new Date()).slice(0, 7).replace('-', '')
  const monthAmount = orders
    .filter((o) => o.orderNo.slice(2, 8).startsWith(monthPrefix) && o.status !== 'cancelled')
    .reduce((s, o) => s + o.totalAmount, 0)
  return {
    monthAmount: monthAmount > 0 ? monthAmount : orders.slice(0, 12).reduce((s, o) => s + o.totalAmount, 0),
    pending: orders.filter((o) => o.status === 'ordered' || o.status === 'partly_received').length,
    supplierCount: ALL_SUPPLIERS.filter((s) => s.status === 'on').length,
  }
}

/* ------------------------------ 销售 ------------------------------ */

export interface TradeRow {
  id: number
  tradeNo: string
  tradeTime: string
  itemCount: number
  paidAmount: number
  payMethod: string
  cashier: string
  member: string
  status: 'normal' | 'void' | 'returned' | 'partly_returned' | 'holding'
}

export const PAY_METHOD_TEXT: Record<string, string> = {
  cash: '现金',
  wechat: '微信支付',
  alipay: '支付宝',
  balance: '储值余额',
  bank: '银行卡',
}

const ALL_TRADES = once('trades', (): TradeRow[] => {
  const { int, money2, pick } = rngTools(20260918)
  const cashiers = ['李小美', '陈小丽', '徐店长']
  const methods = Object.keys(PAY_METHOD_TEXT)
  const today = formatDate(new Date()).replace(/-/g, '')
  return Array.from({ length: 386 }, (_, i) => {
    let status: TradeRow['status'] = 'normal'
    if (i % 37 === 0) status = 'holding'
    else if (i % 23 === 0) status = 'returned'
    else if (i % 41 === 0) status = 'void'
    return {
      id: i + 1,
      tradeNo: `S${today}${String(100386 - i).padStart(6, '0')}`,
      tradeTime: formatDateTime(new Date(Date.now() - i * 3 * 60_000)),
      itemCount: int(1, 14),
      paidAmount: money2(6, 260),
      payMethod: methods[i % methods.length]!,
      cashier: pick(cashiers),
      member: i % 3 === 0 ? `M${String(126 - (i % 60)).padStart(7, '0')}` : '散客',
      status,
    }
  })
})

export function tradeList(count = 386): TradeRow[] {
  return ALL_TRADES.slice(0, count)
}

/** 一个会员卡号 -> 姓名，供交易/退货等处展示 */
export function memberNameByCard(cardNo: string): string {
  const member = memberList().find((m) => m.cardNo === cardNo)
  return member ? member.name : '散客'
}

/** 销售维度统计 */
export function tradeStats() {
  const trades = ALL_TRADES
  const valid = trades.filter((t) => t.status !== 'void')
  const amount = valid.reduce((s, t) => s + t.paidAmount, 0)
  const refund = trades.filter((t) => t.status === 'returned').reduce((s, t) => s + t.paidAmount, 0)
  return {
    amount: Math.round(amount * 100) / 100,
    count: trades.length,
    unitPrice: valid.length ? Math.round((amount / valid.length) * 100) / 100 : 0,
    refund: Math.round(refund * 100) / 100,
    holding: trades.filter((t) => t.status === 'holding').length,
  }
}

export interface SessionRow {
  id: number
  sessionNo: string
  cashier: string
  startAt: string
  endAt: string
  orderCount: number
  saleAmount: number
  returnAmount: number
  cashAmount: number
  onlineAmount: number
  actualCash: number
  diff: number
  status: 'open' | 'closed'
}

const ALL_SESSIONS = once('sessions', (): SessionRow[] => {
  const { int, money2, pick } = rngTools(20260919)
  const cashiers = ['李小美', '陈小丽', '徐店长']
  return Array.from({ length: 24 }, (_, i) => {
    const sale = money2(800, 9800)
    const cash = Math.round(sale * 0.42 * 100) / 100
    const actual = Math.round((cash + (i % 5 === 0 ? -8.5 : 0)) * 100) / 100
    return {
      id: i + 1,
      sessionNo: `SS${formatDate(dayOffset(-i)).replace(/-/g, '')}0${(i % 3) + 1}`,
      cashier: pick(cashiers),
      startAt: formatDateTime(new Date(Date.now() - i * 86400_000 - 34_200_000)),
      endAt: formatDateTime(new Date(Date.now() - i * 86400_000 - 5_400_000)),
      orderCount: int(80, 420),
      saleAmount: sale,
      returnAmount: money2(0, 260),
      cashAmount: cash,
      onlineAmount: Math.round((sale - cash) * 100) / 100,
      actualCash: actual,
      diff: Math.round((actual - cash) * 100) / 100,
      status: i === 0 ? 'open' : 'closed',
    }
  })
})

export function sessionList(count = 24): SessionRow[] {
  return ALL_SESSIONS.slice(0, count)
}

/** 退货可选项：按原交易生成商品明细，保证「退货数量 ≤ 原购买数量 − 已退数量」可校验 */
export interface ReturnItemDraft {
  id: number
  name: string
  price: number
  bought: number
  returned: number
  qty: number
}

export function returnItemsOfTrade(tradeId: number): ReturnItemDraft[] {
  const idx = Math.abs(tradeId) % PRODUCT_SEEDS.length
  const base = [
    PRODUCT_SEEDS[idx % PRODUCT_SEEDS.length]!,
    PRODUCT_SEEDS[(idx + 3) % PRODUCT_SEEDS.length]!,
    PRODUCT_SEEDS[(idx + 7) % PRODUCT_SEEDS.length]!,
  ]
  const { int } = rngTools(20260918 + tradeId)
  return base.map((p, i) => ({
    id: i + 1,
    name: p[0],
    price: p[5],
    bought: int(1, 4),
    returned: i === 1 ? 1 : 0,
    qty: 0,
  }))
}

/* ------------------------------ 会员 ------------------------------ */

export interface MemberRow {
  id: number
  cardNo: string
  name: string
  phone: string
  level: 'normal' | 'silver' | 'gold' | 'platinum'
  balance: number
  points: number
  totalConsume: number
  consumeCount: number
  lastConsumeAt: string
  status: 'normal' | 'pending' | 'disabled'
}

export const MEMBER_LEVEL_TEXT: Record<string, string> = {
  normal: '普通',
  silver: '白银',
  gold: '黄金',
  platinum: '铂金',
}

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡']
const GIVEN = ['丽', '强', '敏', '军', '静', '磊', '洋', '艳', '勇', '娜', '涛', '芳', '杰', '娟', '鹏']

const MEMBER_TOTAL = 1246

const ALL_MEMBERS = once('members', (): MemberRow[] => {
  const { int, money2 } = rngTools(20260920)
  // 等级按 60% 普通 / 25% 白银 / 12% 黄金 / 3% 铂金分配，与消费分析饼图口径一致
  const levelOf = (i: number): MemberRow['level'] => {
    const r = i % 100
    if (r < 60) return 'normal'
    if (r < 85) return 'silver'
    if (r < 97) return 'gold'
    return 'platinum'
  }
  return Array.from({ length: MEMBER_TOTAL }, (_, i) => {
    const total = money2(0, 8600)
    return {
      id: i + 1,
      cardNo: `M${String(MEMBER_TOTAL - i).padStart(7, '0')}`,
      name: `${SURNAMES[i % SURNAMES.length]}${GIVEN[(i * 7) % GIVEN.length]}`,
      phone: `1${[38, 39, 37, 35, 36, 33][i % 6]}${String(10000000 + i * 7919).slice(-8)}`,
      level: levelOf(i),
      balance: i % 3 === 0 ? money2(0, 860) : 0,
      points: int(0, 2400),
      totalConsume: total,
      consumeCount: Math.max(0, Math.round(total / 45)),
      lastConsumeAt: formatDateTime(new Date(Date.now() - (i % 90) * 86400_000)),
      status: i % 47 === 0 ? 'disabled' : i % 31 === 0 ? 'pending' : 'normal',
    }
  })
})

export function memberList(count = MEMBER_TOTAL): MemberRow[] {
  return ALL_MEMBERS.slice(0, count)
}

/** 会员维度统计（含等级分布，供消费分析饼图使用） */
export function memberStats() {
  const all = ALL_MEMBERS
  const levelCount: Record<string, number> = { normal: 0, silver: 0, gold: 0, platinum: 0 }
  let balance = 0
  let active = 0
  const monthAgo = Date.now() - 30 * 86400_000
  all.forEach((m) => {
    levelCount[m.level] = (levelCount[m.level] ?? 0) + 1
    balance += m.balance
    if (new Date(m.lastConsumeAt).getTime() >= monthAgo) active += 1
  })
  return {
    total: all.length,
    balance: Math.round(balance * 100) / 100,
    active,
    levelCount,
    newCount: all.filter((m) => m.status === 'pending').length,
  }
}

export interface BalanceFlowRow {
  id: number
  memberName: string
  cardNo: string
  changeType: 'recharge' | 'consume' | 'refund' | 'adjust' | 'gift'
  amount: number
  giftAmount: number
  afterBalance: number
  payMethod: string
  operator: string
  createdAt: string
}

export const BALANCE_TYPE_TEXT: Record<string, string> = {
  recharge: '充值',
  consume: '消费',
  refund: '退款',
  adjust: '调整',
  gift: '赠送',
}

const ALL_BALANCE_FLOWS = once('balance-flows', (): BalanceFlowRow[] => {
  const { money2, pick } = rngTools(20260921)
  const types: BalanceFlowRow['changeType'][] = ['recharge', 'consume', 'consume', 'gift', 'refund', 'adjust']
  return Array.from({ length: 40 }, (_, i) => {
    const type = types[i % types.length]!
    const isIn = ['recharge', 'gift', 'refund'].includes(type)
    const member = ALL_MEMBERS[i * 13 % ALL_MEMBERS.length]!
    return {
      id: i + 1,
      memberName: member.name,
      cardNo: member.cardNo,
      changeType: type,
      amount: (isIn ? 1 : -1) * money2(10, 300),
      giftAmount: type === 'recharge' ? money2(5, 30) : 0,
      afterBalance: money2(20, 1600),
      payMethod: type === 'recharge' ? pick(['cash', 'wechat', 'alipay']) : '',
      operator: pick(['李小美', '徐店长']),
      createdAt: formatDateTime(new Date(Date.now() - i * 7200_000)),
    }
  })
})

export function balanceFlowList(count = 40): BalanceFlowRow[] {
  return ALL_BALANCE_FLOWS.slice(0, count)
}

export interface PointFlowRow {
  id: number
  memberName: string
  cardNo: string
  changeType: 'gain' | 'refund_deduct' | 'exchange' | 'adjust' | 'expire'
  points: number
  afterPoints: number
  refNo: string
  operator: string
  remark: string
  createdAt: string
}

export const POINT_TYPE_TEXT: Record<string, string> = {
  gain: '消费获得',
  refund_deduct: '退货扣回',
  exchange: '积分兑换',
  adjust: '手工调整',
  expire: '过期清零',
}

const ALL_POINT_FLOWS = once('point-flows', (): PointFlowRow[] => {
  const { int, pick } = rngTools(20260922)
  const types: PointFlowRow['changeType'][] = ['gain', 'gain', 'refund_deduct', 'exchange', 'adjust']
  const today = formatDate(new Date()).replace(/-/g, '')
  return Array.from({ length: 40 }, (_, i) => {
    const type = types[i % types.length]!
    const isIn = ['gain', 'adjust'].includes(type)
    const member = ALL_MEMBERS[i * 7 % ALL_MEMBERS.length]!
    return {
      id: i + 1,
      memberName: member.name,
      cardNo: member.cardNo,
      changeType: type,
      points: (isIn ? 1 : -1) * int(5, 260),
      afterPoints: int(0, 2600),
      refNo: `S${today}${String(100386 - i).padStart(6, '0')}`,
      operator: type === 'gain' ? '系统' : pick(['李小美', '徐店长']),
      remark: type === 'adjust' ? '活动补偿' : '',
      createdAt: formatDateTime(new Date(Date.now() - i * 5400_000)),
    }
  })
})

export function pointFlowList(count = 40): PointFlowRow[] {
  return ALL_POINT_FLOWS.slice(0, count)
}

/* ------------------------------ 促销 ------------------------------ */

export interface ActivityRow {
  id: number
  activityNo: string
  name: string
  promoType: 'full_reduce' | 'discount' | 'special' | 'second_half' | 'gift'
  ruleText: string
  scopeText: string
  startDate: string
  endDate: string
  status: 'pending' | 'running' | 'ended' | 'stopped'
  priority: number
  stackable: boolean
}

export const PROMO_TYPE_TEXT: Record<string, string> = {
  full_reduce: '满减',
  discount: '折扣',
  special: '特价',
  second_half: '第二件半价',
  gift: '买赠',
}

const ACTIVITY_SEEDS: Array<[string, ActivityRow['promoType'], string, string, string, string, ActivityRow['status']]> = [
  ['中秋满减专场', 'full_reduce', '满 100 减 10', '全部商品', '2026-09-10', '2026-09-20', 'running'],
  ['乳品 8.5 折', 'discount', '全场乳品 8.5 折', '分类：饮料', '2026-09-01', '2026-09-30', 'running'],
  ['零食第二件半价', 'second_half', '指定 32 款零食', '指定商品 32 款', '2026-09-05', '2026-09-15', 'running'],
  ['粮油国庆特价', 'special', '五常大米 49.9 元', '指定商品 8 款', '2026-09-25', '2026-10-08', 'pending'],
  ['会员积分双倍', 'gift', '会员积分 2 倍', '全部商品', '2026-08-01', '2026-08-31', 'ended'],
  ['夏日饮料特惠', 'special', '指定 18 款饮料', '指定商品 18 款', '2026-07-01', '2026-07-31', 'ended'],
  ['洗涤日化满减', 'full_reduce', '满 200 减 30', '分类：日用', '2026-09-15', '2026-09-30', 'pending'],
  ['早餐组合惠', 'gift', '买面包赠豆浆', '指定商品 6 款', '2026-09-12', '2026-09-22', 'running'],
  ['饮用水整箱优惠', 'discount', '整箱 9 折', '分类：饮料', '2026-09-01', '2026-09-30', 'running'],
  ['生鲜晚市特价', 'special', '晚间 7 折出清', '分类：生鲜', '2026-08-15', '2026-08-31', 'ended'],
  ['开学季文具满减', 'full_reduce', '满 50 减 8', '分类：日用', '2026-08-20', '2026-09-05', 'ended'],
  ['牛奶买二赠一', 'gift', '买 2 箱赠 1 盒', '指定商品 4 款', '2026-08-01', '2026-08-20', 'ended'],
  ['薯片第二件半价', 'second_half', '指定 12 款零食', '指定商品 12 款', '2026-07-15', '2026-07-31', 'ended'],
  ['粮油满减专场', 'full_reduce', '满 300 减 50', '分类：粮油', '2026-07-01', '2026-07-20', 'ended'],
  ['夏日饮品折扣', 'discount', '指定饮品 8 折', '分类：饮料', '2026-06-15', '2026-06-30', 'ended'],
  ['端午礼盒特价', 'special', '礼盒直降 30 元', '指定商品 5 款', '2026-06-01', '2026-06-10', 'ended'],
  ['日化满 199 减 40', 'full_reduce', '满 199 减 40', '分类：日用', '2026-05-20', '2026-06-05', 'ended'],
  ['儿童零食买赠', 'gift', '买零食赠贴纸', '指定商品 10 款', '2026-05-10', '2026-05-31', 'ended'],
  ['初夏饮料特惠', 'special', '指定 20 款饮料', '指定商品 20 款', '2026-05-01', '2026-05-20', 'ended'],
  ['洗护用品折扣', 'discount', '全场洗护 8.8 折', '分类：日用', '2026-04-15', '2026-04-30', 'ended'],
  ['春季粮油满减', 'full_reduce', '满 150 减 20', '分类：粮油', '2026-04-01', '2026-04-20', 'ended'],
  ['清明踏青买赠', 'gift', '买饮料赠湿巾', '指定商品 8 款', '2026-03-28', '2026-04-06', 'ended'],
  ['开年大促满减', 'full_reduce', '满 200 减 25', '全部商品', '2026-01-10', '2026-02-10', 'ended'],
]

const ALL_ACTIVITIES = once('activities', (): ActivityRow[] =>
  ACTIVITY_SEEDS.map((d, i) => ({
    id: i + 1,
    activityNo: `CX2026${String(900 + i).padStart(4, '0')}`,
    name: d[0],
    promoType: d[1],
    ruleText: d[2],
    scopeText: d[3],
    startDate: d[4],
    endDate: d[5],
    status: d[6],
    priority: 100 - i * 2,
    stackable: i % 3 === 0,
  })),
)

export function activityList(): ActivityRow[] {
  return ALL_ACTIVITIES
}

/** 促销维度统计 */
export function activityStats() {
  const all = ALL_ACTIVITIES
  return {
    running: all.filter((a) => a.status === 'running').length,
    pending: all.filter((a) => a.status === 'pending').length,
    ended: all.filter((a) => a.status === 'ended').length,
    stopped: all.filter((a) => a.status === 'stopped').length,
    total: all.length,
  }
}

export interface CouponRow {
  id: number
  name: string
  couponType: 'cash' | 'discount'
  faceValue: number
  minAmount: number
  validType: string
  validRange: string
  totalQty: number
  issuedQty: number
  usedQty: number
  status: 'on' | 'off'
}

const COUPON_SEEDS: Array<[string, CouponRow['couponType'], number, number, string, string, number]> = [
  ['新人 10 元券', 'cash', 10, 30, '领取后 7 天', '2026-09-01 ~ 2026-12-31', 500],
  ['满 100 减 15', 'cash', 15, 100, '固定日期', '2026-09-01 ~ 2026-09-30', 300],
  ['日用 9 折券', 'discount', 0.9, 0, '领取后 15 天', '2026-09-01 ~ 2026-10-31', 200],
  ['中秋 20 元券', 'cash', 20, 150, '固定日期', '2026-09-10 ~ 2026-09-20', 1000],
  ['会员日 8.8 折', 'discount', 0.88, 50, '固定日期', '2026-09-18 ~ 2026-09-18', 0],
  ['生鲜满 60 减 8', 'cash', 8, 60, '领取后 10 天', '2026-09-01 ~ 2026-10-15', 400],
  ['粮油 9.5 折券', 'discount', 0.95, 80, '领取后 20 天', '2026-09-01 ~ 2026-11-30', 150],
  ['周末双倍券', 'cash', 5, 50, '固定日期', '2026-09-05 ~ 2026-10-31', 600],
]

const ALL_COUPONS = once('coupons', (): CouponRow[] =>
  COUPON_SEEDS.map((d, i) => ({
    id: i + 1,
    name: d[0],
    couponType: d[1],
    faceValue: d[2],
    minAmount: d[3],
    validType: d[4],
    validRange: d[5],
    totalQty: d[6],
    issuedQty: Math.round(d[6] * 0.68),
    usedQty: Math.round(d[6] * 0.31),
    status: i === 4 ? 'off' : 'on',
  })),
)

export function couponList(): CouponRow[] {
  return ALL_COUPONS
}

/* ------------------------------ 系统 ------------------------------ */

export interface UserRow {
  id: number
  username: string
  realName: string
  phone: string
  roles: string[]
  lastLoginAt: string
  status: 'on' | 'off'
}

const USER_SEEDS: Array<[string, string, string[], string, UserRow['status']]> = [
  ['xudianzhang', '徐店长', ['店主'], '13801234567', 'on'],
  ['cashier_li', '李小美', ['收银员'], '13902345678', 'on'],
  ['stock_zhang', '张建国', ['库管员'], '13703456789', 'on'],
  ['buyer_wang', '王海军', ['采购员'], '13604567890', 'on'],
  ['admin', '系统管理员', ['系统管理员'], '13505678901', 'on'],
  ['cashier_chen', '陈小丽', ['收银员'], '13406789012', 'off'],
  ['cashier_zhao', '赵晓雨', ['收银员'], '13307890123', 'on'],
  ['stock_sun', '孙立', ['库管员', '采购员'], '13208901234', 'on'],
  ['buyer_zhou', '周敏', ['采购员'], '13109012345', 'on'],
  ['cashier_wu', '吴倩', ['收银员'], '13010123456', 'on'],
  ['stock_zheng', '郑爽', ['库管员'], '13811234567', 'on'],
  ['temp_01', '临时工', ['收银员'], '13912345678', 'off'],
]

const ALL_USERS = once('users', (): UserRow[] =>
  USER_SEEDS.map((d, i) => ({
    id: i + 1,
    username: d[0],
    realName: d[1],
    phone: d[3],
    roles: d[2],
    lastLoginAt: formatDateTime(new Date(Date.now() - i * 3600_000 * (i + 1))),
    status: d[4],
  })),
)

export function userList(): UserRow[] {
  return ALL_USERS
}

export interface LogRow {
  id: number
  username: string
  realName: string
  module: string
  moduleName: string
  action: string
  target: string
  beforeValue: string
  afterValue: string
  ip: string
  createdAt: string
}

const MODULE_NAME: Record<string, string> = {
  PRD: '商品管理',
  INV: '库存管理',
  PUR: '采购管理',
  SAL: '销售收银',
  MEM: '会员营销',
  SYS: '系统管理',
}

const LOG_ACTIONS: Array<[string, string, string]> = [
  ['PRD', '商品调价', '售价'],
  ['SAL', '交易作废', '—'],
  ['SAL', '退货办理', '—'],
  ['INV', '库存调整', '库存数量'],
  ['SYS', '权限变更', '角色权限'],
  ['PRD', '商品下架', '状态'],
  ['MEM', '会员余额调整', '余额'],
  ['PUR', '采购入库', '库存数量'],
  ['INV', '盘点确认', '库存数量'],
  ['SYS', '参数修改', '参数值'],
]

const ALL_LOGS = once('logs', (): LogRow[] => {
  const { int } = rngTools(20260926)
  const operators: Array<[string, string]> = [
    ['xudianzhang', '徐店长'],
    ['cashier_li', '李小美'],
    ['stock_zhang', '张建国'],
    ['buyer_wang', '王海军'],
  ]
  return Array.from({ length: 60 }, (_, i) => {
    const a = LOG_ACTIONS[i % LOG_ACTIONS.length]!
    const op = operators[i % operators.length]!
    const isPrice = a[2] === '售价'
    const isNum = a[2] === '库存数量'
    return {
      id: i + 1,
      username: op[0],
      realName: op[1],
      module: a[0],
      moduleName: MODULE_NAME[a[0]] ?? a[0],
      action: a[1],
      target: `#${int(100, 1286)}`,
      beforeValue: isPrice ? '52.80' : isNum ? String(int(80, 260)) : '—',
      afterValue: isPrice ? '49.90' : isNum ? String(int(60, 240)) : '—',
      ip: `192.168.1.${int(2, 30)}`,
      createdAt: formatDateTime(new Date(Date.now() - i * 1800_000)),
    }
  })
})

export function logList(count = 60): LogRow[] {
  return ALL_LOGS.slice(0, count)
}

export interface ConfigItem {
  key: string
  label: string
  value: string
  type: 'text' | 'number' | 'switch' | 'textarea'
  group: string
  description: string
}

export const CONFIG_ITEMS: ConfigItem[] = [
  { key: 'store_name', label: '门店名称', value: '阳光社区超市', type: 'text', group: 'store', description: '显示于系统标题与小票抬头' },
  { key: 'store_address', label: '门店地址', value: '阳光路 128 号', type: 'text', group: 'store', description: '用于小票与报表页眉' },
  { key: 'store_phone', label: '联系电话', value: '0571-88886666', type: 'text', group: 'store', description: '顾客咨询电话' },
  { key: 'ticket_header', label: '小票抬头', value: '阳光社区超市', type: 'text', group: 'print', description: '小票顶部第一行文字' },
  { key: 'ticket_footer', label: '小票底部说明', value: '谢谢惠顾，欢迎再次光临！', type: 'text', group: 'print', description: '小票底部提示语' },
  { key: 'print_copies', label: '打印份数', value: '1', type: 'number', group: 'print', description: '结算后自动打印小票的份数' },
  { key: 'safe_stock_default', label: '默认安全库存', value: '30', type: 'number', group: 'stock', description: '新建商品的默认安全库存阈值' },
  { key: 'expire_alert_days', label: '临期预警天数', value: '7', type: 'number', group: 'stock', description: '保质期剩余天数低于该值即预警' },
  { key: 'allow_negative_stock', label: '允许负库存', value: 'false', type: 'switch', group: 'stock', description: '开启后库存可为负值（不建议）' },
  { key: 'point_rate', label: '积分规则', value: '1', type: 'number', group: 'member', description: '每消费 1 元获得的积分' },
  { key: 'point_expire_month', label: '积分有效期（月）', value: '12', type: 'number', group: 'member', description: '积分过期清零周期' },
  { key: 'max_discount', label: '收银员最大折扣', value: '0.9', type: 'number', group: 'system', description: '收银员可自主打折的下限（0.9 表示不低于九折）' },
]

/* ------------------------------ 报表 / 看板 ------------------------------ */

export interface TrendPoint {
  label: string
  /** 当日销售额 */
  value: number
  /** 当日交易笔数 */
  count: number
}

/** 近 N 日销售趋势：末位与今日实际交易数据对齐，保证看板/报表数字与明细自洽 */
export function dailyTrend(days = 7): TrendPoint[] {
  return once(`trend:${days}`, () => {
    const { int } = rngTools(20260927 + days)
    const today = tradeStats()
    const todayAmount = Math.round(today.amount)
    return Array.from({ length: days }, (_, i) => {
      const isToday = i === days - 1
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const value = isToday ? todayAmount : int(9000, 16000)
      const unitPrice = int(28, 42)
      return {
        label,
        value,
        count: isToday ? today.count : Math.max(1, Math.round(value / unitPrice)),
      }
    })
  })
}

export function topProducts(count = 5) {
  return once('top-products', () =>
    [
      ['伊利纯牛奶 250ml×12', 386],
      ['农夫山泉饮用天然水 550ml×24', 342],
      ['乐事薯片 原味 70g', 298],
      ['康师傅红烧牛肉面 5 连包', 256],
      ['五常大米 稻花香 5kg', 214],
      ['蓝月亮深层洁净护理洗衣液 3kg', 186],
      ['蒙牛特仑苏纯牛奶 250ml×12', 164],
      ['可口可乐 330ml×24', 152],
      ['心相印抽纸 3 层 120 抽', 138],
      ['六神花露水 195ml', 121],
    ] as Array<[string, number]>,
  )
    .slice(0, count)
    .map(([name, qty]) => ({ name, qty }))
}

/** 品类销售占比：金额由真实销售总额按比例拆分，保证与「本月销售额」自洽 */
export function categoryShare() {
  return once('category-share', () => {
    const total = tradeStats().amount
    const ratios = [31.2, 25.3, 20.1, 14.9, 8.4]
    const names = ['饮料', '零食', '粮油', '日用', '生鲜']
    return names.map((name, i) => ({
      name,
      amount: Math.round((total * ratios[i]!) / 100),
      ratio: ratios[i]!,
    }))
  })
}

export function slowMovingProducts(count = 3) {
  return [
    { name: '六神花露水 195ml', sales: 0, days: 30, status: '零销售' },
    { name: '蓝月亮 深层洁净护理洗衣液 3kg', sales: 3, days: 30, status: '滞销' },
    { name: '心相印抽纸 3 层 120 抽', sales: 5, days: 30, status: '滞销' },
    { name: '雕牌洗洁精 1.5kg', sales: 7, days: 30, status: '滞销' },
  ].slice(0, count)
}

/** 临期商品（保质期剩余天数低于阈值） */
export function expiringProducts(days = 7) {
  return once(`expiring:${days}`, () =>
    ALL_PRODUCTS.filter((p) => p.shelfLifeDays !== null && p.shelfLifeDays <= 30)
      .slice(0, 12)
      .map((p, i) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        shelfLifeDays: p.shelfLifeDays as number,
        remainDays: Math.max(0, ((i * 3) % 12) as number),
      }))
      .filter((p) => p.remainDays <= days + 10),
  )
}

/* ------------------------------ 登录 ------------------------------ */

export interface AccountSeed {
  username: string
  password: string
  realName: string
  roles: string[]
}

export const ACCOUNTS: AccountSeed[] = [
  { username: 'xudianzhang', password: '123456', realName: '徐店长', roles: ['店主'] },
  { username: 'cashier_li', password: '123456', realName: '李小美', roles: ['收银员'] },
  { username: 'stock_zhang', password: '123456', realName: '张建国', roles: ['库管员'] },
  { username: 'buyer_wang', password: '123456', realName: '王海军', roles: ['采购员'] },
  { username: 'admin', password: '123456', realName: '系统管理员', roles: ['系统管理员'] },
]

