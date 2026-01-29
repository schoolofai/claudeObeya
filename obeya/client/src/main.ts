import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import ObeyaBoard from './views/ObeyaBoard.vue';
import ProjectDetail from './views/ProjectDetail.vue';

// Import TUI Design System styles
import './styles/index.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ObeyaBoard },
    { path: '/project/:id', component: ProjectDetail },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');
