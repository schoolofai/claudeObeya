import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import ObeyaBoard from './views/ObeyaBoard.vue';
import ProjectDetail from './views/ProjectDetail.vue';
import SessionDetail from './views/SessionDetail.vue';
import PlanDetail from './views/PlanDetail.vue';

// Import TUI Design System styles
import './styles/index.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ObeyaBoard },
    { path: '/project/:id', component: ProjectDetail },
    {
      path: '/project/:projectId/session/:uuid',
      component: SessionDetail,
      name: 'session-detail',
    },
    {
      path: '/plan/:planId',
      component: PlanDetail,
      name: 'plan-detail',
    },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');
