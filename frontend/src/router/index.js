import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/components/Home.vue'

// Old links used per-type IDs (/nonogramSolve/12). Puzzles now share one ID
// space, so look up the new ID and redirect; unknown IDs go to the overview.
const legacyRedirect = (type, overviewPath) => ({
  path: `/${type}Solve/:id`,
  component: { render: () => null },
  beforeEnter: async (to) => {
    try {
      const { default: PuzzleService } = await import('@/services/PuzzleService')
      const { data } = await PuzzleService.legacy(type, to.params.id)
      return { path: `/puzzle/${data.id}`, replace: true }
    } catch {
      return { path: overviewPath, replace: true }
    }
  }
})

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
    path: '/datenschutz',
    name: 'Datenschutz',
    component: () => import('@/components/Datenschutz.vue'),
  },
  {
    // Link from the verification e-mail
    path: '/verify/:token',
    component: () => import('@/components/VerifyEmail.vue'),
    props: true
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
    component: () => import('@/puzzles/logical/LogicalEditor.vue'),
  },
  {
    // Edit one of your own logic puzzles (or any, as Admin)
    path: '/logical-create/:id',
    name: 'Logical Edit',
    component: () => import('@/puzzles/logical/LogicalEditor.vue'),
  },
  {
    path: '/nonogram-overview',
    name: 'Nonogram Overview',
    component: () => import('@/components/NonogramOverview.vue'),
  },
  {
    path: '/nonogram-create',
    name: 'Nonogram Create',
    component: () => import('@/puzzles/nonogram/NonogramEditor.vue'),
  },
  {
    // Edit one of your own nonograms (or any, as Admin)
    path: '/nonogram-create/:id',
    name: 'Nonogram Edit',
    component: () => import('@/puzzles/nonogram/NonogramEditor.vue'),
  },
  {
    path: '/linelog-overview',
    name: 'Linelog Overview',
    component: () => import('@/components/LinelogOverview.vue'),
  },
  {
    path: '/linelog-create',
    name: 'Linelog Create',
    component: () => import('@/puzzles/linelog/LinelogEditor.vue'),
  },
  {
    // Edit one of your own linelogs (or any, as Admin)
    path: '/linelog-create/:id',
    name: 'Linelog Edit',
    component: () => import('@/puzzles/linelog/LinelogEditor.vue'),
  },
  {
    // Every puzzle type; the page picks the board from the puzzle's type.
    path: '/puzzle/:id',
    name: 'Puzzle',
    component: () => import('@/puzzles/PuzzlePage.vue')
  },
  legacyRedirect('nonogram', '/nonogram-overview'),
  legacyRedirect('linelog', '/linelog-overview'),
  legacyRedirect('logical', '/logical-overview'),
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
