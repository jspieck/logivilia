import { createRouter, createWebHistory } from 'vue-router'
// import Login from '@/components/Login';
// import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home.vue';
import LogicalSolve from '@/components/LogicalSolve.vue';
import NonogramSolve from '@/components/NonogramSolve.vue';
import LinelogSolve from '@/components/LinelogSolve.vue';
import LogicalOverview from '@/components/LogicalOverview.vue';
import LogicalCreate from '@/components/LogicalCreate.vue';
import NonogramOverview from '@/components/NonogramOverview.vue';
import LinelogOverview from '@/components/LinelogOverview.vue';
import Register from '@/components/Register.vue';
import Login from '@/components/Login.vue';
import Forgot from '@/components/Forgot.vue';
import User from '@/components/User.vue';
import Impressum from '@/components/Impressum.vue';
import PasswordReset from '@/components/PasswordReset.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
  },
  {
    path: '/user/:id',
    name: 'Benutzer',
    component: User,
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/impressum',
    name: 'Impressum',
    component: Impressum,
  },
  {
    path: '/forgot',
    name: 'PasswordForgotten',
    component: Forgot,
  },
  {
    path: '/reset/:token',
    component: PasswordReset,
    props: true
  },
  {
    path: '/logical-overview',
    name: 'Logical Overview',
    component: LogicalOverview,
  },
  {
    path: '/logical-create',
    name: 'Logical Create',
    component: LogicalCreate,
  },
  {
    path: '/nonogram-overview',
    name: 'Nonogram Overview',
    component: NonogramOverview,
  },
  {
    path: '/linelog-overview',
    name: 'Linelog Overview',
    component: LinelogOverview,
  },
  {
    path: '/linelogSolve/:id',
    component: LinelogSolve,
    props: true
  },
  {
    path: '/logicalSolve/:id',
    component: LogicalSolve,
    props: true
  },
  {
    path: '/nonogramSolve/:id',
    name: 'Nonogram',
    component: NonogramSolve,
    props: true
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
