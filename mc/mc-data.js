/* ============================================
   Mission Control - Data Store
   localStorage-backed CRUD with seed data
   ============================================ */

class MCDataStore {
    constructor() {
        this.storageKey = 'mc-data-v1';
        this.data = this._load();
        if (!this.data || !this.data._version) {
            this.data = this._seed();
            this._save();
        }

        // Migrate openclaw → valarnette assignee values
        if (this.data.tasks) {
            var migrated = false;
            this.data.tasks.forEach(function(task) {
                if (task.assignee === 'openclaw') {
                    task.assignee = 'valarnette';
                    migrated = true;
                }
            });
            if (migrated) this._save();
        }

        // Migrate openclaw settings keys → valarnette
        if (this.data.settings) {
            if (this.data.settings.openclawEndpoint !== undefined) {
                this.data.settings.valarnetteEndpoint = this.data.settings.openclawEndpoint;
                delete this.data.settings.openclawEndpoint;
            }
            if (this.data.settings.openclawApiKey !== undefined) {
                this.data.settings.valarnetteApiKey = this.data.settings.openclawApiKey;
                delete this.data.settings.openclawApiKey;
            }
            if (this.data.settings.openclawEndpoint !== undefined || this.data.settings.openclawApiKey !== undefined) {
                this._save();
            }
        }
    }

    // ── UUID generator ──
    _uuid() {
        return 'mc-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    }

    // ── Persistence ──
    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    _save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        window.dispatchEvent(new CustomEvent('mc:data-changed', { detail: { store: this.data } }));
    }

    // ── CRUD ──
    getAll(collection) {
        return (this.data[collection] || []).slice();
    }

    getById(collection, id) {
        return (this.data[collection] || []).find(item => item.id === id) || null;
    }

    create(collection, item) {
        if (!this.data[collection]) this.data[collection] = [];
        const now = new Date().toISOString();
        const newItem = { id: this._uuid(), ...item, createdAt: now, updatedAt: now };
        this.data[collection].push(newItem);
        this._save();
        return newItem;
    }

    update(collection, id, changes) {
        const arr = this.data[collection] || [];
        const idx = arr.findIndex(item => item.id === id);
        if (idx === -1) return null;
        arr[idx] = { ...arr[idx], ...changes, updatedAt: new Date().toISOString() };
        this._save();
        return arr[idx];
    }

    delete(collection, id) {
        const arr = this.data[collection] || [];
        const idx = arr.findIndex(item => item.id === id);
        if (idx === -1) return false;
        arr.splice(idx, 1);
        this._save();
        return true;
    }

    // ── Settings ──
    getSetting(key) {
        return (this.data.settings || {})[key];
    }

    setSetting(key, value) {
        if (!this.data.settings) this.data.settings = {};
        this.data.settings[key] = value;
        this._save();
    }

    // ── Activity Log ──
    logActivity(action, details) {
        if (!this.data.activity) this.data.activity = [];
        this.data.activity.unshift({
            id: this._uuid(),
            action,
            details,
            timestamp: new Date().toISOString()
        });
        if (this.data.activity.length > 50) this.data.activity = this.data.activity.slice(0, 50);
        this._save();
    }

    getActivity(limit = 10) {
        return (this.data.activity || []).slice(0, limit);
    }

    // ── Summary ──
    summary() {
        return {
            content: (this.data.content || []).length,
            contentByStatus: this._countBy('content', 'status'),
            shows: (this.data.shows || []).length,
            upcomingShows: (this.data.shows || []).filter(s => !s.completed).length,
            guests: (this.data.guests || []).length,
            guestsByStatus: this._countBy('guests', 'status'),
            tasks: (this.data.tasks || []).length,
            openTasks: (this.data.tasks || []).filter(t => t.status !== 'done').length,
            funnels: (this.data.funnels || []).length,
            campaigns: (this.data.campaigns || []).length
        };
    }

    _countBy(collection, field) {
        const counts = {};
        (this.data[collection] || []).forEach(item => {
            const val = item[field] || 'unknown';
            counts[val] = (counts[val] || 0) + 1;
        });
        return counts;
    }

    // ── Export / Import ──
    export() {
        return JSON.parse(JSON.stringify(this.data));
    }

    import(json) {
        this.data = typeof json === 'string' ? JSON.parse(json) : json;
        this._save();
    }

    reset() {
        this.data = this._seed();
        this._save();
    }

    // ── Seed Data ──
    _seed() {
        const now = new Date().toISOString();
        return {
            _version: 1,
            settings: {
                artistName: 'Kirk Whalum',
                agentName: 'Valarnette',
                airtableBase: 'appBR3ClZVRxdCnX1'
            },
            activity: [],

            // ── Content Pipeline ──
            content: [
                {
                    id: 'c-001', type: 'sax-tip', typeLabel: 'Sax Tip',
                    title: 'Most sax players make this mistake...',
                    status: 'ready', stage: 'scripted',
                    platform: 'TikTok, Reels', audience: 'Young musicians',
                    funnel: 'consideration', campaign: null,
                    scheduledDate: '2026-03-02',
                    hashtags: '#saxophone #sax #jazz #musictips #learn',
                    hooks: [
                        { letter: 'A', text: 'Most sax players make this mistake...', bestFor: 'Clickbait' },
                        { letter: 'B', text: 'One note. That\'s all you need.', bestFor: 'TikTok' },
                        { letter: 'C', text: 'My grandfather taught me this in Memphis...', bestFor: 'Story' },
                        { letter: 'D', text: 'POV: You\'re at my soundcheck', bestFor: 'POV' }
                    ],
                    bodies: [
                        { letter: 'A', text: 'That note you\'re chasing? Stop. Find the one note that hits different. Play it with everything you got. That\'s the secret.', length: '20 sec' },
                        { letter: 'B', text: 'My mentor told me: Don\'t play so many notes. Play the RIGHT note. Took me 30 years to understand.', length: '25 sec' },
                        { letter: 'C', text: 'Tone isn\'t in your horn. It\'s in your breath. It\'s in your soul. Let me show you how I approach every solo.', length: '22 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Follow for more sax tips', bestFor: 'Growth' },
                        { letter: 'B', text: 'Drop a sax emoji if this helped', bestFor: 'Engagement' },
                        { letter: 'C', text: 'Link in bio for my masterclass', bestFor: 'Sales' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'c-002', type: 'faith', typeLabel: 'Faith',
                    title: 'What I learned reading the Bible every day for 10 years',
                    status: 'ready', stage: 'scripted',
                    platform: 'Instagram, Facebook', audience: 'Faith-based',
                    funnel: 'awareness', campaign: null,
                    scheduledDate: '2026-03-03',
                    hashtags: '#faith #bible #christian #spiritual #BIYE',
                    hooks: [
                        { letter: 'A', text: 'This changed everything for me...', bestFor: 'Mystery' },
                        { letter: 'B', text: 'What I learned reading the Bible every day for 10 years', bestFor: 'BIYE' },
                        { letter: 'C', text: 'Prayer in the green room', bestFor: 'BTS' },
                        { letter: 'D', text: 'Ministry meets music', bestFor: 'Brand' }
                    ],
                    bodies: [
                        { letter: 'A', text: 'Every morning, 6am. Bible in my ear. That\'s the name of the podcast. Join me. 15 minutes. Every day. Transformation starts here.', length: '25 sec' },
                        { letter: 'B', text: 'I used to think ministry and music were separate. Then I realized they\'ve always been the same thing. Every note is a prayer.', length: '28 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Subscribe to BIYE - link in bio', bestFor: 'Podcast' },
                        { letter: 'B', text: 'Share this with someone who needs hope', bestFor: 'Share' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'c-003', type: 'tour', typeLabel: 'Tour',
                    title: 'POV: You\'re on tour with Kirk Whalum',
                    status: 'ready', stage: 'scripted',
                    platform: 'TikTok, Reels', audience: 'All ages',
                    funnel: 'awareness', campaign: null,
                    scheduledDate: '2026-03-04',
                    hashtags: '#tour #livemusic #backstage #saxophone',
                    hooks: [
                        { letter: 'A', text: 'POV: You\'re on tour with Kirk Whalum', bestFor: 'TikTok' },
                        { letter: 'B', text: 'From Memphis to the world...', bestFor: 'Brand' }
                    ],
                    bodies: [
                        { letter: 'A', text: '30 minutes before showtime. Warming up. Praying. Getting centered. This is the ritual. Every city. Every night.', length: '20 sec' },
                        { letter: 'B', text: 'Memphis raised me. Olivet Baptist Church. My dad\'s congregation. Every note I play, I hear that choir.', length: '25 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Come see us live - link in bio for tickets', bestFor: 'Tickets' },
                        { letter: 'B', text: 'Follow for exclusive tour content', bestFor: 'Growth' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'c-004', type: 'reboot', typeLabel: 'Reboot',
                    title: 'I almost quit music...',
                    status: 'draft', stage: 'idea',
                    platform: 'Facebook, YouTube', audience: 'Core fans',
                    funnel: 'decision', campaign: 'reboot-launch',
                    scheduledDate: null,
                    hashtags: '#reboot #musician #career #transformation',
                    hooks: [
                        { letter: 'A', text: 'I almost quit music...', bestFor: 'Drama' },
                        { letter: 'B', text: 'The moment everything changed', bestFor: 'Story' },
                        { letter: 'C', text: 'What 40 years in music taught me', bestFor: 'Wisdom' }
                    ],
                    bodies: [
                        { letter: 'A', text: '2016. Hit a wall. Lost my way. The music felt empty. So I went back to the source. Faith. Family. Memphis. This is my reboot.', length: '30 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Pre-order Reboot - link in bio', bestFor: 'Book' },
                        { letter: 'B', text: 'Share your reboot story in comments', bestFor: 'Engagement' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'c-005', type: 'collabs', typeLabel: 'Collab',
                    title: 'What if saxophone met Afrobeats?',
                    status: 'draft', stage: 'idea',
                    platform: 'TikTok, Reels', audience: 'Young global',
                    funnel: 'awareness', campaign: null,
                    scheduledDate: null,
                    hashtags: '#afrobeats #jazz #saxophone #collab #newmusic',
                    hooks: [
                        { letter: 'A', text: 'What if saxophone met Afrobeats?', bestFor: 'Crossover' },
                        { letter: 'B', text: 'Live sax in 2026 sounds like THIS', bestFor: 'Modern' }
                    ],
                    bodies: [
                        { letter: 'A', text: 'I\'ve played with the greats. Luther. Quincy. Whitney. But right now I\'m listening to Wizkid. Burna Boy. The future is hybrid.', length: '25 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Tag an artist who needs this collab', bestFor: 'Virality' },
                        { letter: 'B', text: 'DM me if you\'re ready to create', bestFor: 'Outreach' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'c-006', type: 'bible', typeLabel: 'BIYE',
                    title: 'Prayer in the green room',
                    status: 'planned', stage: 'idea',
                    platform: 'Instagram, Facebook', audience: 'Faith-based',
                    funnel: 'awareness', campaign: null,
                    scheduledDate: '2026-03-06',
                    hashtags: '#BIYE #bible #faith #prayer #spiritual',
                    hooks: [
                        { letter: 'A', text: 'This is how I prepare for every show...', bestFor: 'Routine' },
                        { letter: 'B', text: 'The green room looks different for me', bestFor: 'BTS' }
                    ],
                    bodies: [
                        { letter: 'A', text: 'Every night, before I walk on stage, I do the same thing. I pray. Not for the music, for the people.', length: '20 sec' }
                    ],
                    ctas: [
                        { letter: 'A', text: 'Share this with someone who needs peace today', bestFor: 'Faith' },
                        { letter: 'B', text: 'Link in bio for BIYE podcast', bestFor: 'Podcast' }
                    ],
                    selectedHook: null, selectedBody: null, selectedCta: null,
                    createdAt: now, updatedAt: now
                }
            ],

            // ── Shows ──
            shows: [
                {
                    id: 's-001', date: '2026-03-12', venue: 'Lounge at City Winery',
                    city: 'Nashville', state: 'TN', ticketLink: '#',
                    status: 'confirmed', notes: '',
                    band: {
                        'Kirk Whalum': { instrument: 'Saxophone', confirmed: true },
                        'John Stoddart': { instrument: 'Keys', confirmed: true },
                        'Andrea Lisa': { instrument: 'Guitar', confirmed: true },
                        'Braylon Lacy': { instrument: 'Bass', confirmed: true },
                        'Marcus Finnie': { instrument: 'Drums', confirmed: true }
                    },
                    chartsDistributed: false, chartDropboxLink: '',
                    ezraEffect: { day1: false, day2: false, day3: false },
                    completed: false,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 's-002', date: null, venue: 'Crosstown Theater',
                    city: 'Memphis', state: 'TN', ticketLink: '#',
                    status: 'planning', notes: 'Homecoming Show / Cafe Kirk',
                    band: {
                        'Kirk Whalum': { instrument: 'Saxophone', confirmed: true },
                        'John Stoddart': { instrument: 'Keys', confirmed: false },
                        'Andrea Lisa': { instrument: 'Guitar', confirmed: false },
                        'Braylon Lacy': { instrument: 'Bass', confirmed: false },
                        'Marcus Finnie': { instrument: 'Drums', confirmed: false }
                    },
                    chartsDistributed: false, chartDropboxLink: '',
                    ezraEffect: { day1: false, day2: false, day3: false },
                    completed: false,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 's-003', date: null, venue: 'Blue Note',
                    city: 'New York', state: 'NY', ticketLink: '#',
                    status: 'tentative', notes: '',
                    band: {
                        'Kirk Whalum': { instrument: 'Saxophone', confirmed: true },
                        'John Stoddart': { instrument: 'Keys', confirmed: false },
                        'Andrea Lisa': { instrument: 'Guitar', confirmed: false },
                        'Braylon Lacy': { instrument: 'Bass', confirmed: false },
                        'Marcus Finnie': { instrument: 'Drums', confirmed: false }
                    },
                    chartsDistributed: false, chartDropboxLink: '',
                    ezraEffect: { day1: false, day2: false, day3: false },
                    completed: false,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 's-004', date: null, venue: 'Chandler Center for the Arts',
                    city: 'Chandler', state: 'AZ', ticketLink: '#',
                    status: 'tentative', notes: '',
                    band: {
                        'Kirk Whalum': { instrument: 'Saxophone', confirmed: true },
                        'John Stoddart': { instrument: 'Keys', confirmed: false },
                        'Andrea Lisa': { instrument: 'Guitar', confirmed: false },
                        'Braylon Lacy': { instrument: 'Bass', confirmed: false },
                        'Marcus Finnie': { instrument: 'Drums', confirmed: false }
                    },
                    chartsDistributed: false, chartDropboxLink: '',
                    ezraEffect: { day1: false, day2: false, day3: false },
                    completed: false,
                    createdAt: now, updatedAt: now
                }
            ],

            // ── CRM Guests ──
            guests: [
                { id: 'g-001', name: 'PJ Morton', genre: 'R&B / Gospel', category: 'warm', status: 'identified', socialLinks: '', notes: 'Personal connection, jazz crossover', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-002', name: 'Jonathan McReynolds', genre: 'Gospel', category: 'warm', status: 'identified', socialLinks: '', notes: 'Gospel crossover appeal', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-003', name: 'Michael McDonald', genre: 'Soft Rock / Soul', category: 'warm', status: 'identified', socialLinks: '', notes: 'Prior collaboration history', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-004', name: 'Tobe Nwigwe', genre: 'Hip Hop / Afro', category: 'warm', status: 'identified', socialLinks: '', notes: 'Houston connection, cultural bridge', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-005', name: 'Robert Glasper', genre: 'Jazz / Hip Hop', category: 'warm', status: 'identified', socialLinks: '', notes: 'Jazz-hip hop crossover', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-006', name: 'Terrace Martin', genre: 'Jazz / Production', category: 'warm', status: 'identified', socialLinks: '', notes: 'Producer, jazz innovator', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-007', name: 'Cory Henry', genre: 'Jazz / Gospel', category: 'warm', status: 'identified', socialLinks: '', notes: 'Keys virtuoso, faith connection', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-008', name: 'Burna Boy', genre: 'Afrobeats', category: 'reach', status: 'identified', socialLinks: '', notes: 'Grammy reach, 40M+ followers', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-009', name: 'Wizkid', genre: 'Afrobeats', category: 'reach', status: 'identified', socialLinks: '', notes: 'Youth crossover, 30M+ followers', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-010', name: 'Tems', genre: 'Afrobeats / R&B', category: 'reach', status: 'identified', socialLinks: '', notes: 'Rising global star', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-011', name: 'Davido', genre: 'Afrobeats', category: 'reach', status: 'identified', socialLinks: '', notes: 'Massive African audience', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-012', name: 'Masego', genre: 'Jazz / Trap', category: 'reach', status: 'identified', socialLinks: '', notes: 'TrapHouseJazz, young audience', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-013', name: 'Jon Batiste', genre: 'Jazz / Pop', category: 'reach', status: 'identified', socialLinks: '', notes: 'Cross-genre appeal, Oscar winner', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-014', name: 'Stax Session Players', genre: 'Soul / R&B', category: 'local', status: 'identified', socialLinks: '', notes: 'Memphis Stax Records legacy artists', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now },
                { id: 'g-015', name: 'Memphis Gospel Community', genre: 'Gospel', category: 'local', status: 'identified', socialLinks: '', notes: 'Local churches, choir directors', lastContacted: null, cafeKirkDate: null, createdAt: now, updatedAt: now }
            ],

            // ── Tasks ──
            tasks: [
                { id: 't-001', title: 'Record Week 1 content', description: '3-5 videos from content pipeline', priority: 'high', status: 'todo', assignee: 'kirk', dueDate: '2026-03-07', createdAt: now, updatedAt: now },
                { id: 't-002', title: 'Add guest contacts to CRM', description: 'PJ Morton, Michael McDonald, local artists', priority: 'high', status: 'todo', assignee: 'kirk', dueDate: '2026-03-05', createdAt: now, updatedAt: now },
                { id: 't-003', title: 'Gospel According to Jazz Ch. 5 writing', description: 'Continue songwriting sessions for new album', priority: 'high', status: 'in-progress', assignee: 'kirk', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-004', title: 'Africa tour prep', description: 'Plan logistics for South Africa June dates', priority: 'medium', status: 'todo', assignee: 'kirk', dueDate: '2026-04-15', createdAt: now, updatedAt: now },
                { id: 't-005', title: 'Live show revamp planning', description: 'Rethink live show format and setlist', priority: 'medium', status: 'todo', assignee: 'kirk', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-006', title: 'Approve Cafe Kirk guest list', description: 'Review and approve guest pipeline for Cafe Kirk events', priority: 'medium', status: 'todo', assignee: 'kirk', dueDate: '2026-03-10', createdAt: now, updatedAt: now },
                { id: 't-007', title: 'Social media content repurposing', description: 'Clip and repurpose existing video content for TikTok/Reels', priority: 'high', status: 'todo', assignee: 'valarnette', dueDate: '2026-03-05', createdAt: now, updatedAt: now },
                { id: 't-008', title: 'Post-show Ezra Effect follow-ups', description: 'Generate follow-up emails for completed shows', priority: 'high', status: 'todo', assignee: 'valarnette', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-009', title: 'Content calendar management', description: 'Schedule and track weekly content across platforms', priority: 'medium', status: 'in-progress', assignee: 'valarnette', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-010', title: 'Website updates', description: 'Keep public website current with shows, releases, and news', priority: 'medium', status: 'todo', assignee: 'valarnette', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-011', title: 'Video clip editing automation', description: 'Set up workflow for auto-clipping long-form to short-form', priority: 'low', status: 'todo', assignee: 'valarnette', dueDate: null, createdAt: now, updatedAt: now },
                { id: 't-012', title: 'Set up email marketing', description: 'ConvertKit/MailerLite for funnel sequences', priority: 'medium', status: 'todo', assignee: 'valarnette', dueDate: '2026-03-14', createdAt: now, updatedAt: now },
                { id: 't-013', title: 'Distribute charts via Dropbox', description: 'Upload and share band charts for upcoming shows', priority: 'medium', status: 'todo', assignee: 'valarnette', dueDate: '2026-03-10', createdAt: now, updatedAt: now }
            ],

            // ── Funnels ──
            funnels: [
                {
                    id: 'f-001', name: 'Sax Masterclass Bootcamp',
                    type: 'bootcamp', status: 'planning',
                    description: '4-week online boot camp for aspiring sax players',
                    stages: [
                        { name: 'Free 5-Day Challenge', type: 'top', status: 'not-started', tasks: ['Create challenge content', 'Set up landing page', 'Write email sequence'], metrics: { traffic: 0, conversions: 0 } },
                        { name: 'Challenge Delivery', type: 'middle', status: 'not-started', tasks: ['Record 5 daily videos', 'Set up email drip', 'Create community group'], metrics: { opens: 0, engagement: 0 } },
                        { name: 'Upsell to Masterclass', type: 'bottom', status: 'not-started', tasks: ['Create sales page', 'Write pitch sequence', 'Set up payment'], metrics: { clicks: 0, purchases: 0 } }
                    ],
                    product: { name: 'The Sax Masterclass', price: '$497-$1,497', tier: 'high' },
                    revenueGoal: 15000, revenueActual: 0,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'f-002', name: 'BIYE Webinar Funnel',
                    type: 'webinar', status: 'planning',
                    description: 'Free mini-training leading to Spiritual Rhythms course',
                    stages: [
                        { name: 'Registration Page', type: 'top', status: 'not-started', tasks: ['Design registration page', 'Set up confirmation emails'], metrics: { visits: 0, registrations: 0 } },
                        { name: 'Live Training: 3 Notes That Change Everything', type: 'middle', status: 'not-started', tasks: ['Prepare presentation', 'Set up Zoom/StreamYard', 'Create replay page'], metrics: { attendees: 0, stayRate: 0 } },
                        { name: 'Offer: Spiritual Rhythms', type: 'bottom', status: 'not-started', tasks: ['Create offer page', 'Write follow-up sequence', 'Set up Stripe'], metrics: { clicks: 0, purchases: 0 } }
                    ],
                    product: { name: 'Spiritual Rhythms', price: '$297', tier: 'mid' },
                    revenueGoal: 5000, revenueActual: 0,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'f-003', name: 'Content-to-Coaching Pipeline',
                    type: 'content', status: 'planning',
                    description: 'Organic content leading to high-ticket private coaching',
                    stages: [
                        { name: 'Organic Content (Sax Tips)', type: 'top', status: 'in-progress', tasks: ['Post 3x/week sax tips', 'Engage in comments', 'Cross-post to all platforms'], metrics: { reach: 0, followers: 0 } },
                        { name: 'Lead Magnet: Sax Starter Guide', type: 'middle', status: 'not-started', tasks: ['Design PDF guide', 'Create opt-in page', 'Write welcome sequence'], metrics: { downloads: 0, optIns: 0 } },
                        { name: 'Email Nurture Sequence', type: 'middle', status: 'not-started', tasks: ['Day 1: Welcome + story', 'Day 3: Pain point content', 'Day 5: Social proof', 'Day 7: The offer'], metrics: { opens: 0, clicks: 0 } },
                        { name: 'High-Ticket Close', type: 'bottom', status: 'not-started', tasks: ['Application form', 'Discovery call booking', 'Follow-up sequence'], metrics: { applications: 0, calls: 0, closed: 0 } }
                    ],
                    product: { name: 'Private Coaching', price: '$2,500+', tier: 'premium' },
                    revenueGoal: 25000, revenueActual: 0,
                    createdAt: now, updatedAt: now
                },
                {
                    id: 'f-004', name: 'Artist Reboot Accelerator',
                    type: 'paid-traffic', status: 'planning',
                    description: 'Facebook/IG ads to Artist Reboot program',
                    stages: [
                        { name: 'Ad Campaign', type: 'top', status: 'not-started', tasks: ['Create ad creatives', 'Set targeting (mid-career musicians)', 'Budget: $500/month'], metrics: { impressions: 0, clicks: 0, cpc: 0 } },
                        { name: 'Landing Page + Tripwire', type: 'middle', status: 'not-started', tasks: ['Design landing page', '$47 Sax Starter Kit offer', 'Upsell flow'], metrics: { visits: 0, purchases: 0 } },
                        { name: 'Core Offer: Artist Reboot', type: 'bottom', status: 'not-started', tasks: ['8-week accelerator curriculum', 'Sales page', 'Enrollment sequence'], metrics: { enrollments: 0, revenue: 0 } }
                    ],
                    product: { name: 'The Artist Reboot', price: '$997', tier: 'high' },
                    revenueGoal: 10000, revenueActual: 0,
                    createdAt: now, updatedAt: now
                }
            ],

            // ── Campaigns ──
            campaigns: [
                { id: 'camp-001', name: 'Reboot Book Launch', description: 'Promoting the Reboot book with personal story content', startDate: '2026-03-15', endDate: '2026-04-15', goal: '1000 pre-orders', contentIds: ['c-004'], status: 'planning', createdAt: now, updatedAt: now },
                { id: 'camp-002', name: 'Epic Cool Promo', description: 'New album release campaign', startDate: '2026-04-01', endDate: '2026-05-01', goal: '50K streams', contentIds: [], status: 'planning', createdAt: now, updatedAt: now }
            ],

            // ── Products ──
            products: [
                { id: 'p-001', name: 'Sax Starter Kit', price: 47, tier: 'low', description: 'Digital download: tone exercises, breathing techniques, beginner solos', status: 'planned', createdAt: now, updatedAt: now },
                { id: 'p-002', name: 'Spiritual Rhythms', price: 297, tier: 'mid', description: '6-week devotional + music course. Daily Bible reading + worship sax tutorials', status: 'planned', createdAt: now, updatedAt: now },
                { id: 'p-003', name: 'The Sax Masterclass', price: 497, priceMax: 1497, tier: 'high', description: '4-week online boot camp: tone, improv, performance psychology, recording', status: 'planned', createdAt: now, updatedAt: now },
                { id: 'p-004', name: 'The Artist Reboot', price: 997, tier: 'high', description: '8-week accelerator: reboot methodology, brand building, revenue diversification', status: 'planned', createdAt: now, updatedAt: now },
                { id: 'p-005', name: 'Private Coaching', price: 2500, tier: 'premium', description: '1-on-1 coaching with Kirk. Limited availability.', status: 'active', createdAt: now, updatedAt: now }
            ]
        };
    }
}

// Global instance
window.mcStore = new MCDataStore();
