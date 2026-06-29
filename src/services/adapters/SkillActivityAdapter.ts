import type { SkillActivityStep } from '../../types/skillActivity';

type Listener = (steps: SkillActivityStep[]) => void;

class SkillActivityAdapter {
  private steps: SkillActivityStep[] = [];
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): SkillActivityStep[] {
    return this.steps.map(step => ({ ...step }));
  }

  clear(): void {
    console.log('skill_activity_clear');
    this.steps = [];
    this.emit();
  }

  start(title: string, detail?: string): string {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log('skill_activity_start', title);
    this.steps.push({
      id,
      title,
      detail,
      inProgress: true,
    });
    this.emit();
    return id;
  }

  done(id: string, title?: string): void {
    console.log('skill_activity_done', id);
    const step = this.steps.find(item => item.id === id);
    if (!step) {
      return;
    }
    step.inProgress = false;
    if (title) {
      step.title = title;
    }
    this.emit();
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}

export const skillActivityAdapter = new SkillActivityAdapter();
