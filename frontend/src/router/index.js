import Vue from 'vue';
import Router from 'vue-router';
// import Login from '@/components/Login';
// import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';
import LogicalSolve from '@/components/LogicalSolve';
import NonogramSolve from '@/components/NonogramSolve';
import LinelogSolve from '@/components/LinelogSolve';
import LogicalOverview from '@/components/LogicalOverview';
import LogicalCreate from '@/components/LogicalCreate';
import NonogramOverview from '@/components/NonogramOverview';
import LinelogOverview from '@/components/LinelogOverview';
import Register from '@/components/Register';
import Login from '@/components/Login';
import Forgot from '@/components/Forgot';
import User from '@/components/User';
import Impressum from '@/components/Impressum';
import PasswordReset from '@/components/PasswordReset';

Vue.use(Router);

export default new Router({
  routes: [
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
  ],
});
