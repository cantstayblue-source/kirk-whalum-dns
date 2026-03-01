/* ============================================
   Mission Control - API Layer v2.0
   window.MC global for Valarnette access
   Full agent integration: CRUD, search, batch,
   events, scheduling, and automation hooks
   ============================================ */

(function () {
    'use strict';

    function ensureStore() {
        if (!window.mcStore) throw new Error('MCDataStore not loaded. Include mc-data.js first.');
        return window.mcStore;
    }

    // ── Event system for agent hooks ──
    const _listeners = {};
    function emit(event, data) {
        ((_listeners[event] || []).concat(_listeners['*'] || [])).forEach(fn => {
            try { fn(data, event); } catch (e) { console.error(`MC event handler error [${event}]:`, e); }
        });
    }

    function makeNamespace(collection) {
        return {
            // ── Core CRUD ──
            list(filter) {
                const store = ensureStore();
                let items = store.getAll(collection);
                if (filter && typeof filter === 'object') {
                    items = items.filter(item =>
                        Object.entries(filter).every(([key, val]) => {
                            if (Array.isArray(val)) return val.includes(item[key]);
                            if (typeof val === 'function') return val(item[key], item);
                            return item[key] === val;
                        })
                    );
                }
                return items;
            },

            get(id) {
                return ensureStore().getById(collection, id);
            },

            create(data) {
                const item = ensureStore().create(collection, data);
                ensureStore().logActivity('create', `New ${collection} item: ${data.title || data.name || item.id}`);
                emit(`${collection}:created`, item);
                emit('change', { collection, action: 'create', item });
                return item;
            },

            update(id, data) {
                const before = ensureStore().getById(collection, id);
                const item = ensureStore().update(collection, id, data);
                if (item) {
                    ensureStore().logActivity('update', `Updated ${collection}: ${item.title || item.name || id}`);
                    emit(`${collection}:updated`, { before, after: item, changes: data });
                    emit('change', { collection, action: 'update', item, changes: data });
                }
                return item;
            },

            remove(id) {
                const item = ensureStore().getById(collection, id);
                const result = ensureStore().delete(collection, id);
                if (result) {
                    ensureStore().logActivity('delete', `Removed ${collection}: ${item?.title || item?.name || id}`);
                    emit(`${collection}:deleted`, item);
                    emit('change', { collection, action: 'delete', item });
                }
                return result;
            },

            count(filter) {
                return filter ? this.list(filter).length : ensureStore().getAll(collection).length;
            },

            // ── Search ──
            search(query, fields) {
                const q = (query || '').toLowerCase();
                if (!q) return this.list();
                const items = ensureStore().getAll(collection);
                return items.filter(item => {
                    const searchFields = fields || Object.keys(item);
                    return searchFields.some(field => {
                        const val = item[field];
                        if (typeof val === 'string') return val.toLowerCase().includes(q);
                        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
                        return false;
                    });
                });
            },

            // ── Batch operations ──
            batchCreate(items) {
                return items.map(data => this.create(data));
            },

            batchUpdate(updates) {
                return updates.map(({ id, data }) => this.update(id, data)).filter(Boolean);
            },

            batchRemove(ids) {
                return ids.map(id => ({ id, removed: this.remove(id) }));
            },

            // ── Sort & query ──
            sorted(field, direction = 'asc') {
                const items = ensureStore().getAll(collection);
                return items.sort((a, b) => {
                    const aVal = a[field] || '';
                    const bVal = b[field] || '';
                    const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
                    return direction === 'desc' ? -cmp : cmp;
                });
            },

            where(predicateFn) {
                return ensureStore().getAll(collection).filter(predicateFn);
            },

            first(filter) {
                return this.list(filter)[0] || null;
            },

            // ── Aggregate ──
            groupBy(field) {
                const groups = {};
                ensureStore().getAll(collection).forEach(item => {
                    const key = item[field] || 'unknown';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(item);
                });
                return groups;
            },

            countBy(field) {
                const counts = {};
                ensureStore().getAll(collection).forEach(item => {
                    const key = item[field] || 'unknown';
                    counts[key] = (counts[key] || 0) + 1;
                });
                return counts;
            },

            // ── Collection info ──
            schema() {
                const items = ensureStore().getAll(collection);
                if (items.length === 0) return { fields: [], sample: null };
                const sample = items[0];
                return {
                    collection,
                    count: items.length,
                    fields: Object.entries(sample).map(([key, val]) => ({
                        name: key,
                        type: Array.isArray(val) ? 'array' : typeof val,
                        sample: Array.isArray(val) ? `[${val.length} items]` : typeof val === 'string' && val.length > 50 ? val.slice(0, 50) + '...' : val
                    })),
                    sample
                };
            }
        };
    }

    window.MC = {
        // ── Namespaces ──
        content: makeNamespace('content'),
        shows: makeNamespace('shows'),
        guests: makeNamespace('guests'),
        tasks: makeNamespace('tasks'),
        funnels: makeNamespace('funnels'),
        campaigns: makeNamespace('campaigns'),
        products: makeNamespace('products'),

        // ── Dashboard ──
        dashboard: {
            summary: () => ensureStore().summary(),
            activity: (limit) => ensureStore().getActivity(limit),
            health() {
                const s = ensureStore().summary();
                return {
                    ...s,
                    warnings: [
                        s.openTasks > 10 ? `${s.openTasks} open tasks — consider prioritizing` : null,
                        s.contentByStatus?.draft > 3 ? `${s.contentByStatus.draft} drafts pending — review pipeline` : null,
                        s.guestsByStatus?.identified > 10 ? `${s.guestsByStatus.identified} guests not yet contacted` : null,
                    ].filter(Boolean),
                    score: Math.round(
                        ((s.content > 0 ? 20 : 0) +
                        (s.upcomingShows > 0 ? 20 : 0) +
                        (s.guests > 0 ? 20 : 0) +
                        (s.funnels > 0 ? 20 : 0) +
                        (s.campaigns > 0 ? 20 : 0))
                    )
                };
            }
        },

        // ── Event System ──
        on(event, handler) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(handler);
            return () => { _listeners[event] = _listeners[event].filter(fn => fn !== handler); };
        },
        off(event, handler) {
            if (_listeners[event]) _listeners[event] = _listeners[event].filter(fn => fn !== handler);
        },
        once(event, handler) {
            const unsub = MC.on(event, (data, evt) => { unsub(); handler(data, evt); });
            return unsub;
        },

        // ── Agent Operations ──
        agent: {
            name: () => ensureStore().getSetting('agentName') || 'Valarnette',

            // Quick task assignment for the agent
            addTask(title, opts = {}) {
                return MC.tasks.create({
                    title,
                    description: opts.description || '',
                    priority: opts.priority || 'medium',
                    status: opts.status || 'todo',
                    assignee: opts.assignee || 'valarnette',
                    dueDate: opts.dueDate || null
                });
            },

            // Complete a task
            completeTask(id) {
                return MC.tasks.update(id, { status: 'done' });
            },

            // Move task to in-progress
            startTask(id) {
                return MC.tasks.update(id, { status: 'in-progress' });
            },

            // Get all agent tasks
            myTasks(status) {
                const filter = { assignee: 'valarnette' };
                if (status) filter.status = status;
                return MC.tasks.list(filter);
            },

            // Log an action for audit trail
            log(message) {
                ensureStore().logActivity('agent', `[${MC.agent.name()}] ${message}`);
            },

            // Get next priority task
            nextTask() {
                const tasks = MC.tasks.list({ assignee: 'valarnette', status: 'todo' });
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                tasks.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));
                return tasks[0] || null;
            },

            // Execute an Ezra Effect follow-up sequence for a show
            triggerEzraEffect(showId) {
                const show = MC.shows.get(showId);
                if (!show) return { error: 'Show not found' };
                const tasks = [
                    { title: `Ezra Effect Day 1: Thank you post for ${show.venue}`, description: 'Post thank you on social media with photos from the show', priority: 'high', dueDate: null, assignee: 'valarnette', status: 'todo' },
                    { title: `Ezra Effect Day 2: Share content from ${show.venue}`, description: 'Share highlight clips and fan photos from the show', priority: 'high', dueDate: null, assignee: 'valarnette', status: 'todo' },
                    { title: `Ezra Effect Day 3: Next show invite from ${show.venue}`, description: 'Send next show invite to attendees and share upcoming dates', priority: 'medium', dueDate: null, assignee: 'valarnette', status: 'todo' }
                ];
                const created = tasks.map(t => MC.tasks.create(t));
                MC.agent.log(`Triggered Ezra Effect for ${show.venue} — ${created.length} follow-up tasks created`);
                return { show: show.venue, tasksCreated: created };
            },

            // Schedule content for publishing
            scheduleContent(contentId, date, platform) {
                const updates = { scheduledDate: date, status: 'ready' };
                if (platform) updates.platform = platform;
                const item = MC.content.update(contentId, updates);
                if (item) MC.agent.log(`Scheduled "${item.title}" for ${date}`);
                return item;
            },

            // Move guest through pipeline
            advanceGuest(guestId, newStatus) {
                const statusFlow = ['identified', 'reached-out', 'in-talks', 'confirmed', 'appeared', 'follow-up'];
                const guest = MC.guests.get(guestId);
                if (!guest) return { error: 'Guest not found' };
                const item = MC.guests.update(guestId, { status: newStatus, lastContacted: new Date().toISOString().split('T')[0] });
                if (item) MC.agent.log(`Advanced ${item.name} to ${newStatus}`);
                return item;
            },

            // Get full status report
            statusReport() {
                const summary = MC.dashboard.summary();
                const agentTasks = MC.tasks.list({ assignee: 'valarnette' });
                const kirkTasks = MC.tasks.list({ assignee: 'kirk' });
                return {
                    timestamp: new Date().toISOString(),
                    agent: MC.agent.name(),
                    overview: summary,
                    agentWorkload: {
                        total: agentTasks.length,
                        todo: agentTasks.filter(t => t.status === 'todo').length,
                        inProgress: agentTasks.filter(t => t.status === 'in-progress').length,
                        done: agentTasks.filter(t => t.status === 'done').length
                    },
                    kirkWorkload: {
                        total: kirkTasks.length,
                        todo: kirkTasks.filter(t => t.status === 'todo').length,
                        inProgress: kirkTasks.filter(t => t.status === 'in-progress').length,
                        done: kirkTasks.filter(t => t.status === 'done').length
                    },
                    recentActivity: MC.dashboard.activity(5)
                };
            }
        },

        // ── Settings ──
        settings: {
            get: (key) => ensureStore().getSetting(key),
            set: (key, val) => {
                ensureStore().setSetting(key, val);
                emit('settings:changed', { key, value: val });
            },
            getAll() {
                return ensureStore().data.settings || {};
            },
            keys: ['artistName', 'agentName', 'airtableBase', 'airtableApiKey', 'valarnetteEndpoint', 'valarnetteApiKey', 'webhookUrl', 'autoEzraEffect', 'contentAutoSchedule', 'defaultAssignee']
        },

        // ── Data management ──
        export: () => ensureStore().export(),
        import: (json) => {
            ensureStore().import(json);
            emit('data:imported', {});
        },
        reset: () => {
            if (typeof window !== 'undefined' && window.confirm) {
                if (!confirm('Reset all Mission Control data to defaults? This cannot be undone.')) return false;
            }
            ensureStore().reset();
            emit('data:reset', {});
            return true;
        },
        resetSilent: () => {
            ensureStore().reset();
            emit('data:reset', {});
            return true;
        },

        // ── Collections metadata ──
        collections() {
            return ['content', 'shows', 'guests', 'tasks', 'funnels', 'campaigns', 'products'].map(name => ({
                name,
                count: MC[name].count(),
                schema: MC[name].schema()
            }));
        },

        // ── Utility ──
        version: '2.0.0',
        help() {
            const docs = `
╔══════════════════════════════════════════════╗
║   Kirk Whalum Mission Control API v2.0       ║
║   Powered by Valarnette                       ║
╚══════════════════════════════════════════════╝

NAMESPACES: MC.content, MC.shows, MC.guests, MC.tasks,
            MC.funnels, MC.campaigns, MC.products

Each namespace supports:
  .list([filter])           Get all (filter: object, array vals, or functions)
  .get(id)                  Get by ID
  .create(data)             Create new item
  .update(id, data)         Update item
  .remove(id)               Delete item
  .count([filter])          Count items (optional filter)
  .search(query, [fields])  Full-text search
  .sorted(field, dir)       Sort by field ('asc'|'desc')
  .where(predicateFn)       Filter with custom function
  .first([filter])          Get first matching item
  .groupBy(field)           Group items by field value
  .countBy(field)           Count items per field value
  .schema()                 Get collection schema + sample
  .batchCreate([items])     Create multiple items
  .batchUpdate([{id,data}]) Update multiple items
  .batchRemove([ids])       Delete multiple items

AGENT:
  MC.agent.myTasks([status])             Get agent's tasks
  MC.agent.addTask(title, opts)          Quick-add task
  MC.agent.startTask(id)                 Move to in-progress
  MC.agent.completeTask(id)              Mark done
  MC.agent.nextTask()                    Get highest priority task
  MC.agent.log(message)                  Log agent activity
  MC.agent.statusReport()                Full status report
  MC.agent.triggerEzraEffect(showId)     Post-show follow-ups
  MC.agent.scheduleContent(id, date)     Schedule content
  MC.agent.advanceGuest(id, status)      Move guest in pipeline

EVENTS:
  MC.on(event, handler)    Subscribe (returns unsubscribe fn)
  MC.off(event, handler)   Unsubscribe
  MC.once(event, handler)  One-time subscription
  Events: 'change', '{collection}:created|updated|deleted',
          'settings:changed', 'data:imported', 'data:reset', '*'

DASHBOARD:
  MC.dashboard.summary()    Aggregate metrics
  MC.dashboard.activity(n)  Recent activity
  MC.dashboard.health()     Health score + warnings

SETTINGS:
  MC.settings.get(key)      Read setting
  MC.settings.set(key,val)  Write setting
  MC.settings.getAll()      All settings

DATA:
  MC.export()               Export all data
  MC.import(json)           Import data
  MC.reset()                Reset to defaults (with confirm)
  MC.resetSilent()          Reset without confirm (agent use)
  MC.collections()          List all collections with schemas
`;
            console.log(docs);
            return docs;
        }
    };

    console.log('%c🎷 Mission Control API v2.0 loaded — type MC.help() for docs', 'color: #c9a227; font-weight: bold;');
})();
