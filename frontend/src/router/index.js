import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/components/Home.vue'

// Home is part of the main bundle (first paint); every other page is its own
// chunk, loaded when the route is first visited.
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/components/Register.vue'),
  },
  {
    path: '/user/:id',
    name: 'Benutzer',
    component: () => import('@/components/User.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/components/Login.vue'),
  },
  {
    path: '/impressum',
    name: 'Impressum',
    component: () => import('@/components/Impressum.vue'),
  },
  {
    path: '/forgot',
    name: 'PasswordForgotten',
    component: () => import('@/components/Forgot.vue'),
  },
  {
    path: '/reset/:token',
    component: () => import('@/components/PasswordReset.vue'),
    props: true
  },
  {
    path: '/logical-overview',
    name: 'Logical Overview',
    component: () => import('@/components/LogicalOverview.vue'),
  },
  {
    path: '/logical-create',
    name: 'Logical Create',
    component: () => import('@/components/LogicalCreate.vue'),
  },
  {
    path: '/nonogram-overview',
    name: 'Nonogram Overview',
    component: () => import('@/components/NonogramOverview.vue'),
  },
  {
    path: '/linelog-overview',
    name: 'Linelog Overview',
    component: () => import('@/components/LinelogOverview.vue'),
  },
  {
    path: '/linelogSolve/:id',
    component: () => import('@/components/LinelogSolve.vue'),
    props: true
  },
  {
    path: '/logicalSolve/:id',
    component: () => import('@/components/LogicalSolve.vue'),
    props: true
  },
  {
    path: '/nonogramSolve/:id',
    name: 'Nonogram',
    component: () => import('@/components/NonogramSolve.vue'),
    props: true
  },
  {
    path: '/leaderboard',
    name: 'leaderboard',
    component: () => import('@/components/Leaderboard.vue')
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
