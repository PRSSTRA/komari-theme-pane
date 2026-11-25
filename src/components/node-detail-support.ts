import { useEffect, useState } from 'react';
import type { Language } from '../types/komari';

const labels = {
  'zh-CN': {
    monthlyQuota: '月流量配额', system: '系统信息', processor: '处理器', cores: '核心', os: '操作系统', kernel: '内核',
    archVirt: '架构 / 虚拟化', arch: '架构', virt: '虚拟化', ram: '内存', ramSwap: '内存 / 交换', loadAverages: '负载 1m / 5m / 15m',
    temp: '温度', group: '分组', groupTags: '分组 / 标签', billing: '续费信息', cycle: '续费周期', expires: '到期日',
    amount: '续费金额', renewal: '自动续期标记', enabled: '已标记', manual: '未标记', monthly: '月付', quarterly: '季付', yearly: '年付',
    load: '负载历史', ping: 'Ping 延迟', history: '历史图表', window: '历史时间范围', now: '现在', timeout: '超时 100%', timedOut: '超时',
    loading: '正在加载历史记录…', error: '无法加载历史记录', empty: '此时间段暂无记录', pingUnavailable: '无法加载 Ping 数据',
    isolate: '单独查看该线路（再次点击恢复全部）', task: '任务',
    loss: (rate: string) => `丢包 ${rate}%`, days: (days: number) => `${days} 天`,
    cpuCores: (logical: number, physical?: number) => physical ? `${logical} 逻辑 / ${physical} 物理` : `${logical} 核`,
  },
  en: {
    monthlyQuota: 'Monthly Quota', system: 'System Info', processor: 'Processor', cores: 'Cores', os: 'OS', kernel: 'Kernel',
    archVirt: 'Arch / Virt', arch: 'Arch', virt: 'Virtualization', ram: 'RAM', ramSwap: 'RAM / Swap', loadAverages: 'Load 1m / 5m / 15m',
    temp: 'Temp', group: 'Group', groupTags: 'Group / Tags', billing: 'Billing & Renewal', cycle: 'Cycle', expires: 'Expires',
    amount: 'Amount', renewal: 'Auto-Renewal', enabled: 'Enabled', manual: 'Manual', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
    load: 'Load History', ping: 'Ping Latency', history: 'History charts', window: 'History time range', now: 'Now', timeout: 'Timeout 100%', timedOut: 'Timed out',
    loading: 'Loading history…', error: 'Could not load history', empty: 'No records in this time range', pingUnavailable: 'Could not load Ping data',
    isolate: 'Show only this route (select again to show all)', task: 'Task',
    loss: (rate: string) => `${rate}% loss`, days: (days: number) => `${days}d`,
    cpuCores: (logical: number, physical?: number) => physical ? `${logical} Logical / ${physical} Physical` : `${logical} ${logical === 1 ? 'Core' : 'Cores'}`,
  },
};

export function detailLabels(lang: Language) {
  return labels[lang];
}

type Request<T> = (signal: AbortSignal) => Promise<T>;
type Result<T> = { status: 'ready'; data: T; requestedAt: number } | { status: 'error' };

export function useDetailRequest<T>(request: Request<T>, refreshMs?: number) {
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<{ request: Request<T>; attempt: number; result: Result<T>; lastData?: T }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let refresh: number | undefined;
    async function fetch() {
      const requestedAt = Date.now();
      try {
        const data = await request(signal);
        if (!signal.aborted) setCompleted({ request, attempt, result: { status: 'ready', data, requestedAt }, lastData: data });
      } catch {
        if (!signal.aborted) setCompleted(prior => ({ request, attempt, result: { status: 'error' }, lastData: prior?.lastData }));
      }
      if (!signal.aborted && refreshMs) refresh = window.setTimeout(() => void fetch(), refreshMs);
    }
    void fetch();
    return () => {
      controller.abort();
      window.clearTimeout(refresh);
    };
  }, [request, attempt, refreshMs]);

  const result: Result<T> | { status: 'loading' } = completed?.request === request && completed.attempt === attempt
    ? completed.result : { status: 'loading' };
  const retry = () => setAttempt(value => value + 1);
  return { result, retry, lastData: completed?.lastData };
}
