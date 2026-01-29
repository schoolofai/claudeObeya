<script setup lang="ts">
import { useProjects } from '../composables/useProjects';
import { TuiSpinner, TuiBox } from '../components/tui';
import StatsSummary from '../components/StatsSummary.vue';
import ProjectCard from '../components/ProjectCard.vue';

const { overview, loading, error } = useProjects();
</script>

<template>
  <div class="obeya-board">
    <div v-if="loading && !overview" class="loading-state">
      <TuiSpinner variant="braille" :speed="80" :glow="true">
        Initializing dashboard...
      </TuiSpinner>
    </div>

    <div v-else-if="error" class="error-state">
      <span class="error-icon">[✗]</span>
      <span class="error-text">ERROR: {{ error }}</span>
    </div>

    <template v-else-if="overview">
      <StatsSummary
        :total-projects="overview.total_projects"
        :active-sessions="overview.active_sessions"
        :in-progress-plans="overview.in_progress_plans"
        :total-tasks="overview.total_tasks"
        :completed-tasks="overview.completed_tasks"
      />

      <div v-if="overview.projects.length === 0" class="empty-state">
        <TuiBox variant="double" title="NO PROJECTS">
          <div class="empty-content">
            <pre class="ascii-art">
    ┌─────────────────────────┐
    │                         │
    │    ░░░ WAITING ░░░      │
    │                         │
    │   No projects detected  │
    │                         │
    └─────────────────────────┘
            </pre>
            <p class="empty-hint">[i] Projects will appear when Claude Code sessions are detected</p>
          </div>
        </TuiBox>
      </div>

      <div v-else class="projects-section">
        <div class="section-header">
          <span class="section-icon">┌─</span>
          <span class="section-title">PROJECTS</span>
          <span class="section-count">[{{ overview.projects.length }}]</span>
          <span class="section-line">─────────────────────────────────</span>
        </div>
        <div class="projects-grid">
          <ProjectCard
            v-for="project in overview.projects"
            :key="project.id"
            :project="project"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.obeya-board {
  max-width: 1400px;
  margin: 0 auto;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--tui-space-4);
  padding: var(--tui-space-16);
  color: var(--tui-text-muted);
}

.error-state {
  color: var(--tui-error);
}

.error-icon {
  font-size: var(--tui-font-size-xl);
  font-weight: var(--tui-font-weight-bold);
}

.error-text {
  font-size: var(--tui-font-size-base);
}

.empty-state {
  max-width: 500px;
  margin: var(--tui-space-8) auto;
}

.empty-content {
  text-align: center;
}

.ascii-art {
  color: var(--tui-text-muted);
  font-size: var(--tui-font-size-sm);
  line-height: var(--tui-line-height-base);
  margin-bottom: var(--tui-space-4);
}

.empty-hint {
  font-size: var(--tui-font-size-sm);
  color: var(--tui-text-secondary);
}

.projects-section {
  margin-top: var(--tui-space-4);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--tui-space-2);
  margin-bottom: var(--tui-space-4);
}

.section-icon {
  color: var(--tui-text-muted);
}

.section-title {
  font-size: var(--tui-font-size-sm);
  font-weight: var(--tui-font-weight-semibold);
  color: var(--tui-theme-primary);
  letter-spacing: var(--tui-letter-spacing-wider);
}

.section-count {
  color: var(--tui-text-muted);
}

.section-line {
  flex: 1;
  color: var(--tui-text-muted);
  overflow: hidden;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--tui-space-4);
}
</style>
