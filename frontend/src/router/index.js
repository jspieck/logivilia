import Vue from 'vue';
import Router from 'vue-router';
// import Login from '@/components/Login';
// import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';
import LogicalSolve from '@/components/LogicalSolve';
import NonogramSolve from '@/components/NonogramSolve';
import LinelogSolve from '@/components/LinelogSolve';
import LogicalOverview from '@/components/LogicalOverview';
import NonogramOverview from '@/components/NonogramOverview';
import LinelogOverview from '@/components/LinelogOverview';

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
