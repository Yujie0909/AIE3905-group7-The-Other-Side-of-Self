<script setup lang="ts">
/**
 * 阶段标题与引导文案：阶段标签、中英文标题、逐行淡入的引导句。
 */
defineProps<{
  stageLabel: string
  title?: string
  subtitle?: string
  lines: string[]
}>()
</script>

<template>
  <div class="typo">
    <p class="typo__stage">{{ stageLabel }}</p>

    <h1 v-if="title" class="typo__title">{{ title }}</h1>
    <p v-if="subtitle" class="typo__subtitle">{{ subtitle }}</p>

    <div class="typo__lines" role="text">
      <p
        v-for="(line, i) in lines"
        :key="line"
        class="typo__line"
        :style="{ animationDelay: `${0.15 + i * 0.55}s` }"
      >
        {{ line }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.typo {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: min(86vw, 680px);
}

.typo__stage {
  margin: 0 0 var(--space-3);
  font-size: var(--fs-stage-label);
  letter-spacing: var(--tracking-label);
  text-indent: var(--tracking-label);
  color: var(--c-cyan-dim);
  font-weight: 500;
  animation: fade-up var(--dur-line) var(--ease-soft) both;
}

.typo__title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-serif);
  font-size: var(--fs-title);
  font-weight: 500;
  letter-spacing: 0.18em;
  text-indent: 0.18em;
  line-height: 1.25;
  color: var(--c-text);
  text-shadow: 0 0 40px rgba(142, 219, 228, 0.25);
  animation: fade-up var(--dur-line) 0.1s var(--ease-soft) both;
}

.typo__subtitle {
  margin: 0 0 var(--space-4);
  font-size: var(--fs-subtitle);
  letter-spacing: var(--tracking-subtitle);
  text-indent: var(--tracking-subtitle);
  text-transform: uppercase;
  color: var(--c-text-secondary);
  animation: fade-up var(--dur-line) 0.3s var(--ease-soft) both;
}

.typo__lines {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.typo__line {
  margin: 0;
  font-size: var(--fs-body);
  line-height: 1.9;
  color: var(--c-text-secondary);
  text-shadow: 0 1px 12px rgba(2, 8, 14, 0.6);
  animation: fade-up var(--dur-line) var(--ease-soft) both;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
