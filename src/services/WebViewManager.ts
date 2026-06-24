import type { SkillResult } from '../types/skill';

export type BackgroundTask = {
  id: string;
  html: string;
};

type TaskListener = (task: BackgroundTask | null) => void;

type PendingTask = {
  id: string;
  resolve: (result: SkillResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class WebViewManager {
  private activeTask: BackgroundTask | null = null;
  private isReady = false;
  private listeners = new Set<TaskListener>();
  private readyWaiters: Array<() => void> = [];
  private pendingTask: PendingTask | null = null;

  private emit() {
    for (const listener of this.listeners) {
      listener(this.activeTask);
    }
  }

  private sanitizeHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<embed[\s\S]*?>/gi, '')
      .replace(/<object[\s\S]*?<\/object>/gi, '');
  }

  private buildTaskHtml(taskId: string, html: string, input: unknown): string {
    const sanitizedInput = JSON.stringify(input ?? null);
    const encodedInput = sanitizedInput
      .replace(/</g, '\\x3c')
      .replace(/>/g, '\\x3e')
      .replace(/&/g, '\\x26');
    const bridge = `<script>(function(){const taskId=${JSON.stringify(taskId)};const input=${encodedInput};const normalize=function(value){if(value&&typeof value==='object'&&('result'in value||'error'in value||'image'in value||'webview'in value)){return value;}if(typeof value==='string'){return{result:value};}return{result:JSON.stringify(value??'')};};const send=function(payload){window.ReactNativeWebView.postMessage(JSON.stringify({type:'skill_result',taskId:taskId,payload:payload}));};const run=async function(){try{const runner=window.runSkill||window.run||(window.skill&&typeof window.skill.run==='function'?window.skill.run.bind(window.skill):null);if(typeof runner!=='function'){throw new Error('skill_runner_missing');}const value=await runner(input);send(normalize(value));}catch(error){send({error:error instanceof Error?error.message:String(error)});}};if(document.readyState==='complete'||document.readyState==='interactive'){setTimeout(run,0);}else{window.addEventListener('load',function(){setTimeout(run,0);},{once:true});}})();</script>`;
    const sanitizedHtml = this.sanitizeHtml(html);

    if (sanitizedHtml.includes('</body>')) {
      return sanitizedHtml.replace('</body>', `${bridge}</body>`);
    }

    if (sanitizedHtml.includes('</html>')) {
      return sanitizedHtml.replace('</html>', `${bridge}</html>`);
    }

    return `${sanitizedHtml}${bridge}`;
  }

  private clearPendingTask(taskId?: string) {
    if (this.pendingTask && (!taskId || this.pendingTask.id === taskId)) {
      clearTimeout(this.pendingTask.timer);
      this.pendingTask = null;
    }
    if (!taskId || this.activeTask?.id === taskId) {
      this.activeTask = null;
      this.emit();
    }
  }

  private waitUntilReady(timeoutMs = 5000): Promise<void> {
    if (this.isReady) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.readyWaiters = this.readyWaiters.filter(waiter => waiter !== onReady);
        reject(new Error('skill_runtime_unavailable'));
      }, timeoutMs);

      const onReady = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.readyWaiters.push(onReady);
    });
  }

  subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    listener(this.activeTask);
    return () => {
      this.listeners.delete(listener);
    };
  }

  markReady(): void {
    if (!this.isReady) {
      this.isReady = true;
      const waiters = [...this.readyWaiters];
      this.readyWaiters = [];
      waiters.forEach(waiter => waiter());
    }
  }

  getTask(): BackgroundTask | null {
    return this.activeTask;
  }

  async runSkillHtml(html: string, input: unknown, timeoutMs = 30000): Promise<SkillResult> {
    if (this.pendingTask) {
      throw new Error('skill_runtime_busy');
    }

    await this.waitUntilReady();

    const taskId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return new Promise<SkillResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.clearPendingTask(taskId);
        reject(new Error('skill_runtime_timeout'));
      }, timeoutMs);

      this.pendingTask = {
        id: taskId,
        resolve,
        reject,
        timer,
      };
      this.activeTask = {
        id: taskId,
        html: this.buildTaskHtml(taskId, html, input),
      };
      this.emit();
    });
  }

  handleMessage(message: string): void {
    let parsed: { type?: string; taskId?: string; payload?: SkillResult };

    try {
      parsed = JSON.parse(message) as { type?: string; taskId?: string; payload?: SkillResult };
    } catch {
      if (this.pendingTask) {
        const { resolve, id } = this.pendingTask;
        this.clearPendingTask(id);
        resolve({ result: message });
      }
      return;
    }

    if (!this.pendingTask || parsed.type !== 'skill_result' || parsed.taskId !== this.pendingTask.id) {
      return;
    }

    const { resolve, id } = this.pendingTask;
    this.clearPendingTask(id);
    resolve(parsed.payload || {});
  }

  async stop(): Promise<void> {
    if (this.pendingTask) {
      const { reject, id } = this.pendingTask;
      this.clearPendingTask(id);
      reject(new Error('skill_runtime_stopped'));
    }

    this.isReady = false;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      hasTask: !!this.activeTask,
      isBusy: !!this.pendingTask,
    };
  }

  isWebViewReady() {
    return this.isReady;
  }
}

export const backgroundWebViewManager = new WebViewManager();