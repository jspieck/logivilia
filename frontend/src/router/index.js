import Vue from 'vue';
import Router from 'vue-router';
// import Login from '@/components/Login';
// import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';
import LogicalSolve from '@/components/LogicalSolve';
import NonogramSolve from '@/components/NonogramSolve';
import LogicalOverview from '@/components/LogicalOverview';
import NonogramOverview from '@/components/NonogramOverview';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
    {
      path: '/logical-overview',
      name: 'Logical Overview',
      component: LogicalOverview,
    },
    {
      path: '/nonogram-overview',
      name: 'Nonogram Overview',
      component: NonogramOverview,
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
