'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ListTodo,
  MoonStar,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
  { id: 'all', label: 'Todas', icon: ListTodo },
  { id: 'active', label: 'Em aberto', icon: CircleDashed },
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

function MetricCard({ label, value, note }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <div className="metric-value tabular-nums">{value}</div>
      {note ? <p className="metric-note">{note}</p> : null}
    </div>
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
            <Badge variant="success">Concluída</Badge>
          ) : (
            <Badge variant="subtle">Em aberto</Badge>
          )}
        </div>
        {task.description ? <p className="task-description line-clamp-2">{task.description}</p> : null}
        <div className="task-meta">
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
  const [view, setView] = useState('all');
  const [dateLabel, setDateLabel] = useState('');
  const [greetingLabel, setGreetingLabel] = useState('');
  const [queryInput, setQueryInput] = useState('');
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
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
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);
  const [quickError, setQuickError] = useState('');

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
      const [listResult, totalResult, completedResult, activeResult] = await Promise.all([
        getTasks({ page, limit: 10, completed: completedFilter, search }),
        getTasks({ page: 1, limit: 1 }),
        getTasks({ page: 1, limit: 1, completed: true }),
        getTasks({ page: 1, limit: 1, completed: false }),
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

  const filteredLabel = view === 'active' ? 'Em aberto' : view === 'completed' ? 'Concluídas' : 'Todas as tarefas';
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

  async function handleQuickCreate(event) {
    event.preventDefault();
    const cleanTitle = quickTitle.trim();
    if (!cleanTitle) return;

    setQuickCreating(true);
    setQuickError('');
    setError('');
    setNotice('');
    try {
      await createTask({ title: cleanTitle, description: null });
      setQuickTitle('');
      setNotice('Tarefa criada.');
      setView('all');
      setPage(1);
      await loadData();
    } catch (createError) {
      setQuickError(createError.message || 'Não foi possível criar a tarefa.');
    } finally {
      setQuickCreating(false);
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
    { label: 'Total', value: stats.total, note: 'tarefas na lista' },
    { label: 'Em aberto', value: stats.active, note: 'ainda por fazer' },
    { label: 'Concluídas', value: stats.completed, note: 'já finalizadas' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Menu principal">
        <div className="brand-row flex items-center gap-3">
          <div className="brand-mark" aria-hidden="true"><MoonStar className="brand-moon" strokeWidth={1.8} /></div>
          <div className="brand-word min-w-0">
            <div className="brand-name">turno<span>.</span></div>
            <div className="brand-caption">Tarefas com calma</div>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="nav-section-label">Organize-se</p>
          <nav className="sidebar-nav" aria-label="Filtrar tarefas">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                title={label}
                onClick={() => { setView(id); setPage(1); }}
                className={`nav-item ${view === id ? 'active' : ''}`}
                aria-current={view === id ? 'page' : undefined}
              >
                <Icon className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-connection">
            <span className={`status-dot ${apiState === 'online' ? 'bg-emerald-400' : apiState === 'offline' ? 'bg-rose-400' : 'bg-amber-300'}`} />
            <span className="sidebar-connection-label">{apiState === 'online' ? 'Conectado' : apiState === 'offline' ? 'Sem conexão' : 'Conectando'}</span>
            <button type="button" className="sidebar-refresh" onClick={loadData} title="Atualizar tarefas" aria-label="Atualizar tarefas">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-context">Meu espaço</div>
          <div className="topbar-tools flex items-center gap-4">
            <label className="search-wrap">
              <Search className="size-4 shrink-0 text-slate-500" />
              <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Buscar tarefa..." aria-label="Buscar tarefas" />
              {queryInput && <button type="button" onClick={() => { setQueryInput(''); setSearch(''); }} aria-label="Limpar busca" className="text-slate-500 hover:text-white"><X className="size-4" /></button>}
            </label>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="hero-row mb-8 flex items-end justify-between gap-6">
            <div className="hero-copy">
              <div className="hero-date">{dateLabel}</div>
              <h1 className="hero-title">{greetingLabel} <span>Vamos por partes.</span></h1>
              <p className="hero-subtitle">Veja o que falta e escolha a próxima tarefa.</p>
            </div>
            <Button onClick={openCreateDialog} className="primary-task-button shrink-0"><Plus className="size-5" /> Nova tarefa</Button>
          </section>

          <section className="metric-grid mb-7 grid grid-cols-3 gap-3" aria-label="Resumo das tarefas">
            {statsCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </section>

          <div className="content-columns grid grid-cols-1 items-start gap-4">
            <section className="min-w-0">
              <Card className="task-panel overflow-hidden">
                <CardHeader className="task-panel-header gap-4 border-b border-border/70 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="section-title">{filteredLabel}</CardTitle>
                      <p className="section-kicker">O que você precisa fazer agora.</p>
                    </div>
                  </div>
                  <div className="task-filters flex flex-wrap items-center gap-2">
                    {[
                      { id: 'all', label: 'Todas' },
                      { id: 'active', label: 'Em aberto' },
                      { id: 'completed', label: 'Concluídas' },
                    ].map((item) => (
                      <button key={item.id} onClick={() => { setView(item.id); setPage(1); }} className={`filter-button ${view === item.id ? 'active' : ''}`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                {error && (
                  <div className="load-error mx-5 mt-5 flex items-start gap-3 border border-rose-300/15 bg-rose-400/[0.05] p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-rose-200">Não foi possível carregar as tarefas.</p>
                      <p className="mt-1 leading-5 text-rose-200/75">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="size-4" /> Tentar novamente</Button>
                  </div>
                )}

                <div aria-live="polite">
                  {loading ? (
                    <div className="task-loading-list">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="task-loading-row" aria-hidden="true">
                          <div className="task-loading-check animate-pulse" />
                          <div className="min-w-0 flex-1">
                            <div className="task-loading-title animate-pulse" />
                            <div className="task-loading-description animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : tasks.length > 0 ? (
                    tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={handleToggle} onEdit={openEditDialog} onDelete={handleDelete} busy={busyId === task.id} />)
                  ) : !error ? (
                    !search && stats.total === 0 && view === 'all' ? (
                      <div className="empty-first-task">
                        <MoonStar className="empty-moon" strokeWidth={1.7} aria-hidden="true" />
                        <h3>Sua lista começa aqui.</h3>
                        <p>Adicione a primeira tarefa. O resto pode esperar.</p>
                        <form className="quick-create-form" onSubmit={handleQuickCreate}>
                          <Input
                            value={quickTitle}
                            onChange={(event) => { setQuickTitle(event.target.value); setQuickError(''); }}
                            maxLength={150}
                            placeholder="O que precisa fazer?"
                            aria-label="Título da primeira tarefa"
                          />
                          <Button type="submit" disabled={quickCreating || !quickTitle.trim()}>
                            {quickCreating ? <><RefreshCw className="size-4 animate-spin" /> Salvando...</> : <><Plus className="size-4" /> Adicionar tarefa</>}
                          </Button>
                        </form>
                        {quickError && <p role="alert" className="quick-create-error">{quickError}</p>}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>{search ? 'Nenhuma tarefa encontrada.' : view === 'completed' ? 'Ainda não há tarefas concluídas.' : 'Você não tem tarefas em aberto.'}</h3>
                        <p>{search ? 'Tente outro termo ou limpe a busca.' : 'Quando houver algo para fazer, vai aparecer aqui.'}</p>
                        {search && <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQueryInput(''); setSearch(''); }}>Limpar busca</Button>}
                      </div>
                    )
                  ) : null}
                </div>

                {pagination.total > 0 && (
                  <div className="task-pagination flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-4">
                    <p>{`Mostrando ${Math.min((page - 1) * 10 + 1, pagination.total)}–${Math.min(page * 10, pagination.total)} de ${pagination.total}`}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Página anterior"><ChevronLeft className="size-4" /></Button>
                      <span className="task-page-number">Página {Math.max(1, page)} de {Math.max(1, pagination.totalPages)}</span>
                      <Button variant="outline" size="icon" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((current) => current + 1)} aria-label="Próxima página"><ChevronRight className="size-4" /></Button>
                    </div>
                  </div>
                )}
              </Card>
            </section>
          </div>
        </main>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>{editingTask ? 'Atualize os detalhes da tarefa.' : 'Adicione o que precisa fazer.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="mt-2 space-y-4">
            <div className="space-y-2">
              <label htmlFor="task-title" className="dialog-label">Título <span className="text-violet-300">*</span></label>
              <Input id="task-title" autoFocus maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: finalizar a entrega do projeto" />
            </div>
            <div className="space-y-2">
              <label htmlFor="task-description" className="dialog-label">Descrição <span className="text-slate-500">(opcional)</span></label>
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

