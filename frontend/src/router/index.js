import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import LogicalSolve from '@/components/LogicalSolve';
import NonogramSolve from '@/components/NonogramSolve';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Login',
      component: Login,
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard,
    },
    {
      path: '/logicalSolve',
      name: 'Logical',
      component: LogicalSolve,
    },
    {
      path: '/nonogramSolve',
      name: 'Nonogram',
      component: NonogramSolve,
    },
  ],
});
