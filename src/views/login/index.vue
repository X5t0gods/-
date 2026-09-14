<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <section class="login-brand">
      <div class="brand-top">
        <div class="brand-logo">
          <el-icon :size="22"><ShoppingBag /></el-icon>
        </div>
        <span class="brand-name">社区超市管理系统</span>
      </div>

      <div class="brand-body">
        <h1 class="brand-title">中小型社区超市<br />销售管理系统</h1>
        <p class="brand-desc">
          覆盖商品 · 库存 · 采购 · 销售 · 会员 · 报表的一体化经营闭环，让社区超市的每一笔生意都有数据可依。
        </p>
        <ul class="brand-features">
          <li>
            <el-icon><CircleCheck /></el-icon>
            全流程覆盖：商品建档到收银结算，一套系统管到底
          </li>
          <li>
            <el-icon><DataLine /></el-icon>
            数据驱动：经营看板实时呈现销售额、毛利与库存预警
          </li>
          <li>
            <el-icon><UserFilled /></el-icon>
            角色分级：店主 / 收银 / 库管 / 采购权限清晰可控
          </li>
        </ul>
      </div>

      <div class="brand-foot">基于 Django 4.x · B/S 架构 · MySQL 数据存储</div>
    </section>

    <!-- 右侧登录表单 -->
    <section class="login-form-wrap">
      <div class="login-form">
        <h2>欢迎登录</h2>
        <p class="form-sub">请使用门店分配的账号登录系统</p>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent>
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入账号 / 手机号"
              :prefix-icon="User"
              clearable
              @keyup.enter="onSubmit"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="onSubmit"
            />
          </el-form-item>

          <div class="form-row">
            <el-checkbox v-model="form.remember">记住账号</el-checkbox>
            <a class="forget" @click="onForget">忘记密码？</a>
          </div>

          <el-button type="primary" class="login-btn" size="large" :loading="loading" @click="onSubmit">
            登 录
          </el-button>
        </el-form>

        <p class="form-tip">登录即表示同意《门店数据安全规范》</p>

        <div class="demo-accounts">
          <span class="demo-title">演示账号（密码均为 123456）：</span>
          <div class="demo-tags">
            <el-tag
              v-for="a in ACCOUNTS"
              :key="a.username"
              size="small"
              class="demo-tag"
              @click="fill(a.username)"
            >
              {{ a.username }} · {{ a.realName }}
            </el-tag>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { ACCOUNTS } from '@/utils/mock'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  remember: true,
})

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入登录密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于 6 位', trigger: 'blur' },
  ],
}

function fill(username: string): void {
  form.username = username
  form.password = '123456'
}

function onForget(): void {
  ElMessage.info('请联系门店管理员重置密码')
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  // 模拟请求延迟，贴近真实登录体验
  await new Promise((resolve) => setTimeout(resolve, 380))
  const result = userStore.login(form.username, form.password)
  loading.value = false

  if (!result.ok) {
    ElMessage.error(result.message)
    return
  }
  ElMessage.success(`欢迎回来，${userStore.displayName}`)
  const redirect = (route.query.redirect as string) || '/dashboard'
  router.push(redirect)
}
</script>

<style scoped>
.login-page {
  display: flex;
  height: 100%;
  min-height: 100vh;
}

/* ---------------- 左侧品牌区 ---------------- */
.login-brand {
  flex: 0 0 47%;
  background: linear-gradient(160deg, #1565c0 0%, #0b3d80 52%, #08305f 100%);
  color: #ffffff;
  padding: 44px 56px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.login-brand::after {
  content: '';
  position: absolute;
  right: -160px;
  bottom: -160px;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
}

.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.brand-logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #ffffff;
  color: var(--brand-7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.brand-body {
  position: relative;
  z-index: 1;
  max-width: 460px;
}

.brand-title {
  font-size: 38px;
  line-height: 1.35;
  margin: 0 0 20px;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-desc {
  font-size: 14px;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.76);
  margin: 0 0 34px;
}

.brand-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.brand-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.9);
}

.brand-features .el-icon {
  font-size: 17px;
  color: #7ba3ea;
  flex: 0 0 17px;
}

.brand-foot {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  position: relative;
  z-index: 1;
}

/* ---------------- 右侧表单区 ---------------- */
.login-form-wrap {
  flex: 1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-form {
  width: 100%;
  max-width: 380px;
}

.login-form h2 {
  font-size: 26px;
  margin: 0 0 8px;
  color: var(--text-primary);
}

.form-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 30px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.forget {
  font-size: 13px;
  cursor: pointer;
}

.login-btn {
  width: 100%;
  font-size: 15px;
  letter-spacing: 4px;
  height: 44px;
}

.form-tip {
  text-align: center;
  font-size: 12px;
  color: var(--text-placeholder);
  margin: 16px 0 0;
}

.demo-accounts {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-color);
}

.demo-title {
  font-size: 12px;
  color: var(--text-placeholder);
}

.demo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.demo-tag {
  cursor: pointer;
}
</style>
