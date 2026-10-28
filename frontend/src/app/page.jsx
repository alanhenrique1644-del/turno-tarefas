'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  Command,
  FileText,
  LayoutDashboard,
  ListTodo,
  Layers3,
  MoonStar,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createTask, deleteTask, getHealth, getTasks, updateTask } from '@/lib/api';

const VIEWS = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'all', label: 'Todas as tarefas', icon: ListTodo },
  { id: 'active', label: 'Em andamento', icon: CircleDashed },
  { id: 'completed', label: 'Concluídas', icon: CheckCheck },
];

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(new Date()));
  if (hour < 12) return 'Bom dia.';
  if (hour < 18) return 'Boa tarde.';
  return 'Boa noite.';
}

function formatToday() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo',
  }).format(new Date()).replace('-feira', '-feira');
}

function formatShortDate(value) {
  if (!value) return 'Agora';
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}

function formatLongDate(value) {
  if (!value) return 'Data indisponível';
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace('.', '');
}

function MetricCard({ label, value, note, icon: Icon, accent = 'violet', trend }) {
  const accentClass = accent === 'blue' ? 'text-sky-300' : accent === 'green' ? 'text-emerald-300' : accent === 'white' ? 'text-slate-200' : 'text-violet-300';
  return (
    <Card className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <p className="metric-label">{label}</p>
        <span className="metric-icon"><Icon className="size-4" /></span>
      </div>
      <div className="metric-value tabular-nums">{value}</div>
      <div className="flex items-center gap-1.5 metric-note">
        {trend ? <ArrowUpRight className={`size-3 ${accentClass}`} /> : <span className="status-dot bg-slate-600" />}
        <span>{note}</span>
      </div>
    </Card>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, busy }) {
  return (
    <div className="task-row group">
      <div className="pt-[2px]">
        <Checkbox
          checked={Boolean(task.completed)}
          disabled={busy}
          onCheckedChange={(checked) => onToggle(task, Boolean(checked))}
          aria-label={task.completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`task-title ${task.completed ? 'completed' : ''}`}>{task.title}</span>
          {task.completed ? (
            <Badge variant="success"><Check className="size-2.5" /> Concluída</Badge>
          ) : (
            <Badge variant="subtle"><span className="status-dot bg-violet-300" /> Em aberto</Badge>
          )}
        </div>
        {task.description ? <p className="task-description line-clamp-2">{task.description}</p> : null}
        <div className="task-meta">
          <span className="font-mono tracking-wide">T-{String(task.id).padStart(4, '0')}</span>
          <span className="status-dot bg-slate-700" />
          <span>{task.completed ? 'Atualizada' : 'Adicionada'} {formatShortDate(task.updated_at || task.created_at)}</span>
        </div>
      </div>
      <div className="task-actions flex shrink-0 items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button className="icon-action" onClick={() => onEdit(task)} title="Editar tarefa" aria-label={`Editar ${task.title}`}>
          <Pencil className="size-3.5" />
        </button>
        <button className="icon-action hover:!text-rose-300" onClick={() => onDelete(task)} title="Excluir tarefa" aria-label={`Excluir ${task.title}`}>
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState('overview');
  const [dateLabel, setDateLabel] = useState('');
  const [greetingLabel, setGreetingLabel] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0 });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiState, setApiState] = useState('checking');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(queryInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const completedFilter = view === 'active' ? false : view === 'completed' ? true : undefined;
      const [listResult, totalResult, completedResult, activeResult, queueResult] = await Promise.all([
        getTasks({ page, limit: 10, completed: completedFilter, search }),
        getTasks({ page: 1, limit: 1 }),
        getTasks({ page: 1, limit: 1, completed: true }),
        getTasks({ page: 1, limit: 1, completed: false }),
        getTasks({ page: 1, limit: 5, completed: false }),
      ]);
      const totalPages = listResult.pagination.totalPages;
      if (page > Math.max(1, totalPages)) {
        setPage(Math.max(1, totalPages));
        return;
      }
      setTasks(listResult.data);
      setPagination(listResult.pagination);
      setStats({
        total: totalResult.pagination.total,
        completed: completedResult.pagination.total,
        active: activeResult.pagination.total,
      });
      setQueue(queueResult.data);
      setApiState('online');
      getHealth().catch(() => setApiState('offline'));
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar as tarefas.');
      setApiState('offline');
    } finally {
      setLoading(false);
    }
  }, [page, view, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const filteredLabel = view === 'active' ? 'Tarefas em andamento' : view === 'completed' ? 'Tarefas concluídas' : 'O que está na mesa';
  useEffect(() => {
    // Valores dependentes do relógio são calculados somente no navegador,
    // após a hidratação, para evitar erro de prerender do Next.js.
    setDateLabel(formatToday());
    setGreetingLabel(greeting());
  }, []);

  function openCreateDialog() {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setFormError('');
    setDialogOpen(true);
  }

  function openEditDialog(task) {
    setEditingTask(task);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!title.trim()) {
      setFormError('Dê um título para esta tarefa antes de salvar.');
      return;
    }
    setSaving(true);
    setFormError('');
    setNotice('');
    try {
      const payload = { title: title.trim(), description: description.trim() || null };
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        setNotice('Alterações salvas.');
      } else {
        await createTask(payload);
        setNotice('Tarefa adicionada ao seu turno.');
        setView('all');
        setSearch('');
        setQueryInput('');
        setPage(1);
      }
      setDialogOpen(false);
      await loadData();
    } catch (saveError) {
      setFormError(saveError.message || 'Não foi possível salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(task, completed) {
    setBusyId(task.id);
    setNotice('');
    try {
      await updateTask(task.id, { completed });
      setNotice(completed ? 'Tarefa concluída. Bom trabalho.' : 'Tarefa voltou para a fila.');
      await loadData();
    } catch (toggleError) {
      setError(toggleError.message || 'Não foi possível atualizar esta tarefa.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(task) {
    const confirmed = window.confirm(`Excluir a tarefa “${task.title}”? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    setBusyId(task.id);
    setNotice('');
    try {
      await deleteTask(task.id);
      setNotice('Tarefa excluída.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir esta tarefa.');
    } finally {
      setBusyId(null);
    }
  }

  const statsCards = [
    { label: 'Tarefas no total', value: stats.total, note: 'Registros no seu espaço', icon: Layers3, accent: 'white' },
    { label: 'Em andamento', value: stats.active, note: 'Ainda pedem sua atenção', icon: Activity, accent: 'blue' },
    { label: 'Concluídas', value: stats.completed, note: 'Passos que já ficaram para trás', icon: CheckCheck, accent: 'green', trend: stats.completed > 0 },
    { label: 'Ritmo de conclusão', value: `${progress}%`, note: 'Do total de tarefas registradas', icon: TrendingUp, accent: 'violet' },
    { label: 'Visíveis nesta página', value: tasks.length, note: `Página ${page} de ${Math.max(1, pagination.totalPages)}`, icon: ListTodo, accent: 'blue' },
    { label: 'Na fila rápida', value: queue.length, note: 'Tarefas abertas mais recentes', icon: Clock3, accent: 'white' },
  ];

  return (
    <div className="app-shell">
      <div className="noise-overlay" aria-hidden="true" />
      <aside className="sidebar" aria-label="Menu principal">
        <div className="brand-row flex items-center gap-3">
          <div className="brand-mark"><Command className="size-[17px]" strokeWidth={1.8} /></div>
          <div className="brand-word min-w-0">
            <div className="text-[15px] font-semibold tracking-[-0.04em] text-slate-100">turno<span className="text-violet-300">.</span></div>
            <div className="brand-caption">TASK MANAGER</div>
          </div>
        </div>

        <button type="button" className="sidebar-create" onClick={openCreateDialog} aria-label="Nova tarefa">
          <Plus className="size-4" />
          <span className="sidebar-create-label">Nova tarefa</span>
          <span className="sidebar-shortcut" aria-hidden="true">+</span>
        </button>

        <div className="sidebar-section">
          <p className="nav-section-label">Organização</p>
          <nav className="sidebar-nav" aria-label="Navegação principal">
            {VIEWS.map(({ id, label, icon: Icon }) => {
              const count = id === 'all' ? stats.total : id === 'active' ? stats.active : id === 'completed' ? stats.completed : null;
              return (
                <button key={id} title={label} onClick={() => { setView(id); setPage(1); }} className={`nav-item ${view === id ? 'active' : ''}`} aria-current={view === id ? 'page' : undefined}>
                  <Icon className="nav-icon" strokeWidth={1.8} />
                  <span className="nav-label">{label}</span>
                  {count !== null && <span className="nav-count">{count}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-progress">
            <div className="sidebar-progress-heading">
              <span>Progresso geral</span>
              <strong>{progress}%</strong>
            </div>
            <div className="sidebar-progress-track" role="progressbar" aria-label="Progresso geral" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>{stats.completed} de {stats.total} tarefas concluídas</p>
          </div>
          <div className="sidebar-connection">
            <span className={`status-dot ${apiState === 'online' ? 'bg-emerald-400' : apiState === 'offline' ? 'bg-rose-400' : 'bg-amber-300'}`} />
            <span className="sidebar-connection-label">{apiState === 'online' ? 'API conectada' : apiState === 'offline' ? 'API desconectada' : 'Conectando à API'}</span>
            <button type="button" className="sidebar-refresh" onClick={loadData} title="Atualizar dados" aria-label="Atualizar dados">
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-600">
            <span>Workspace</span><span className="text-slate-800">/</span><span className="text-slate-400">Pessoal</span>
          </div>
          <div className="topbar-tools flex items-center gap-4">
            <label className="search-wrap">
              <Search className="size-3.5 shrink-0 text-slate-500" />
              <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Buscar uma tarefa..." aria-label="Buscar tarefas" />
              {queryInput && <button onClick={() => { setQueryInput(''); setSearch(''); }} aria-label="Limpar busca" className="text-slate-500 hover:text-white"><X className="size-3.5" /></button>}
            </label>
            <div className="hidden sm:block h-7 w-px bg-white/[0.08]" />
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <MoonStar className="size-4 text-indigo-300/80" />
              <span className="hidden sm:inline">MODO NOTURNO</span>
            </div>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="hero-row mb-8 flex items-end justify-between gap-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="eyebrow">{dateLabel}</span>
                <span className="status-dot bg-slate-700" />
                <span className="text-[10px] uppercase tracking-[0.13em] text-slate-600">Painel pessoal · 01</span>
              </div>
              <h1 className="hero-title">{greetingLabel} <span className="text-slate-500">Vamos fechar o dia.</span></h1>
              <p className="hero-subtitle mt-3 max-w-[600px]">Um pouco de ordem no meio da correria. Veja o que ficou, escolha o próximo passo e siga no seu ritmo.</p>
            </div>
            <Button onClick={openCreateDialog} className="shrink-0"><Plus className="size-4" /> Nova tarefa</Button>
          </section>

          <section className="metric-grid mb-7 grid grid-cols-4 gap-3" aria-label="Indicadores das tarefas">
            {statsCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </section>

          <div className="content-columns grid grid-cols-[minmax(0,1fr)_300px] items-start gap-4">
            <section className="min-w-0">
              <Card className="overflow-hidden">
                <CardHeader className="gap-4 border-b border-border/70 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><span className="status-dot bg-violet-300" /><CardTitle className="section-title">{filteredLabel}</CardTitle></div>
                      <p className="section-kicker">Uma visão prática do que está acontecendo agora.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={openCreateDialog}><Plus className="size-3.5" /> Adicionar</Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'overview', label: 'Tudo' },
                        { id: 'active', label: 'Em aberto' },
                        { id: 'completed', label: 'Concluídas' },
                      ].map((item) => (
                        <button key={item.id} onClick={() => { setView(item.id); setPage(1); }} className={`filter-button ${view === item.id || (item.id === 'overview' && view === 'all') ? 'active' : ''}`}>
                          {item.label}
                          {item.id === 'active' && <span className="text-[9px] opacity-60">{stats.active}</span>}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600"><Clock3 className="size-3.5" /> Mais recentes primeiro</div>
                  </div>
                </CardHeader>

                {error && (
                  <div className="mx-5 mt-5 flex items-start gap-3 border border-rose-300/15 bg-rose-400/[0.05] p-3.5">
                    <span className="mt-1 status-dot bg-rose-300" />
                    <div className="min-w-0 flex-1"><p className="text-xs font-medium text-rose-200">Não foi possível carregar o painel</p><p className="mt-1 text-[11px] leading-5 text-rose-200/65">{error}</p></div>
                    <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="size-3" /> Tentar novamente</Button>
                  </div>
                )}

                <div aria-live="polite">
                  {loading ? (
                    <div className="space-y-0">
                      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex gap-3 border-b border-white/[0.045] px-5 py-[19px]"><div className="size-[18px] animate-pulse bg-white/[0.06]" /><div className="flex-1"><div className="h-3 w-1/2 animate-pulse bg-white/[0.06]" /><div className="mt-3 h-2 w-4/5 animate-pulse bg-white/[0.04]" /></div></div>)}
                    </div>
                  ) : tasks.length > 0 ? (
                    tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={handleToggle} onEdit={openEditDialog} onDelete={handleDelete} busy={busyId === task.id} />)
                  ) : !error ? (
                    <div className="empty-state">
                      <span className="empty-icon"><FileText className="size-5" strokeWidth={1.5} /></span>
                      <h3 className="mt-4 text-sm font-medium text-slate-200">{search ? 'Nenhum resultado por aqui' : view === 'completed' ? 'Nenhuma tarefa concluída ainda' : view === 'active' ? 'Fila limpa por enquanto' : 'Seu espaço começa aqui'}</h3>
                      <p className="mx-auto mt-2 max-w-[310px] text-[11px] leading-6 text-slate-500">{search ? 'Tente buscar por outro termo ou limpe a pesquisa.' : 'Adicione uma tarefa para tirar a primeira coisa da cabeça e colocar no papel.'}</p>
                      {search ? <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQueryInput(''); setSearch(''); }}>Limpar pesquisa</Button> : <Button size="sm" className="mt-4" onClick={openCreateDialog}><Plus className="size-3.5" /> Criar primeira tarefa</Button>}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5">
                  <p className="text-[10px] text-slate-600">{pagination.total === 0 ? 'Nenhuma tarefa para mostrar' : `Mostrando ${Math.min((page - 1) * 10 + 1, pagination.total)}–${Math.min(page * 10, pagination.total)} de ${pagination.total} tarefas`}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="size-7" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Página anterior"><ChevronLeft className="size-3.5" /></Button>
                    <span className="min-w-12 text-center font-mono text-[10px] text-slate-500">{String(Math.max(1, page)).padStart(2, '0')} <span className="text-slate-700">/</span> {String(Math.max(1, pagination.totalPages)).padStart(2, '0')}</span>
                    <Button variant="outline" size="icon" className="size-7" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} aria-label="Próxima página"><ChevronRight className="size-3.5" /></Button>
                  </div>
                </div>
              </Card>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-700">
                <span className="flex items-center gap-2"><span className="font-mono">TURN-01</span><span>·</span><span>Seu espaço, seu ritmo.</span></span>
                <span>Os dados são salvos na sua API.</span>
              </div>
            </section>

            <aside className="right-rail min-w-0">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="section-title">Resumo das tarefas</CardTitle>
                    <Target className="size-4 text-violet-300" />
                  </div>
                  <p className="section-kicker">Acompanhe o andamento sem abrir outra tela.</p>
                </CardHeader>
                <CardContent>
                  <div className="summary-progress-top">
                    <div>
                      <p className="summary-progress-label">CONCLUÍDAS</p>
                      <div className="summary-progress-value">{progress}<span>%</span></div>
                    </div>
                    <div className="summary-progress-count"><strong>{stats.completed}</strong><span>de {stats.total}</span></div>
                  </div>
                  <div className="summary-progress-track" role="progressbar" aria-label="Percentual de tarefas concluídas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="summary-status-list">
                    <div className="summary-status-row">
                      <span><i className="summary-status-mark open" />Em andamento</span>
                      <strong>{stats.active}</strong>
                    </div>
                    <div className="summary-status-row">
                      <span><i className="summary-status-mark done" />Concluídas</span>
                      <strong>{stats.completed}</strong>
                    </div>
                  </div>
                  <p className="summary-progress-caption">{stats.total === 0 ? 'Crie sua primeira tarefa para começar.' : stats.active === 0 ? 'Tudo em dia. Nenhuma tarefa em aberto.' : `${stats.active} ${stats.active === 1 ? 'tarefa aguarda' : 'tarefas aguardam'} sua atenção.`}</p>
                </CardContent>
              </Card>

              <Card className="mt-4 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="section-title">Na fila</CardTitle>
                    <Badge variant="outline">{queue.length} abertas</Badge>
                  </div>
                  <p className="section-kicker">Tarefas abertas adicionadas por último.</p>
                </CardHeader>
                <CardContent className="pb-4">
                  {queue.length ? <div>{queue.slice(0, 5).map((task, index) => (
                    <button key={task.id} className="mini-row w-full text-left" onClick={() => openEditDialog(task)} title={`Editar ${task.title}`}>
                      <span className="flex min-w-0 items-start gap-2.5"><span className="pt-0.5 font-mono text-[9px] text-slate-700">0{index + 1}</span><span className="min-w-0"><span className="block truncate text-[11px] text-slate-300">{task.title}</span><span className="mt-1 block text-[9px] text-slate-600">Criada em {formatShortDate(task.created_at)}</span></span></span>
                      <Pencil className="size-3 shrink-0 text-slate-700" />
                    </button>
                  ))}</div> : <div className="py-5 text-center"><CheckCheck className="mx-auto size-5 text-emerald-300/70" /><p className="mt-2 text-[11px] text-slate-400">Nada pendente na fila.</p><p className="mt-1 text-[10px] text-slate-600">Bom momento para respirar.</p></div>}
                </CardContent>
              </Card>


              <div className="flex items-center justify-between px-1 pt-3">
                <span className="api-indicator"><span className={`status-dot ${apiState === 'online' ? 'bg-emerald-400 text-emerald-400' : apiState === 'offline' ? 'bg-rose-400 text-rose-400' : 'bg-amber-300 text-amber-300'}`} />{apiState === 'online' ? 'API conectada' : apiState === 'offline' ? 'API desconectada' : 'Conferindo API'}</span>
                <button className="text-[10px] text-slate-600 transition hover:text-slate-300" onClick={loadData} title="Atualizar dados"><RefreshCw className="inline size-3" /></button>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex size-9 items-center justify-center border border-violet-300/20 bg-violet-300/[0.08] text-violet-200"><FileText className="size-4" /></div>
            <DialogTitle>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>{editingTask ? 'Ajuste os detalhes e mantenha seu espaço atualizado.' : 'Tire essa ideia da cabeça e coloque na sua lista.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <div className="space-y-2">
              <label htmlFor="task-title" className="text-[11px] font-medium text-slate-300">Título <span className="text-violet-300">*</span></label>
              <Input id="task-title" autoFocus maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: finalizar a entrega do projeto" />
              <p className="text-right text-[9px] text-slate-600">{title.length}/150</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="task-description" className="text-[11px] font-medium text-slate-300">Descrição <span className="text-slate-600">· opcional</span></label>
              <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto, detalhes ou o próximo passo..." rows={4} />
            </div>
            {formError && <p role="alert" className="border border-rose-300/15 bg-rose-400/[0.06] px-3 py-2 text-[11px] text-rose-200">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving || !title.trim()}>{saving ? <><RefreshCw className="size-3.5 animate-spin" /> Salvando</> : <><Check className="size-3.5" /> {editingTask ? 'Salvar alterações' : 'Criar tarefa'}</>}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {notice && <div role="status" className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100%-2rem)] items-center gap-2 border border-emerald-300/15 bg-[#131a20] px-4 py-3 text-[11px] text-emerald-100 shadow-xl"><Check className="size-3.5 text-emerald-300" />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso" className="ml-2 text-slate-500 hover:text-white"><X className="size-3.5" /></button></div>}
    </div>
  );
}

