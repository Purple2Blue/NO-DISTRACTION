// ---------- Toast ----------
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-notification px-lg py-sm rounded-2xl shadow-2xl flex items-center gap-md border border-white/10 min-w-[280px]`;

    let icon = 'check_circle';
    let iconColor = 'text-[#4ade80]';
    if (type === 'warning') {
        icon = 'warning';
        iconColor = 'text-[#fbbf24]';
    } else if (type === 'error') {
        icon = 'error';
        iconColor = 'text-[#ef4444]';
    }

    toast.innerHTML = `
        <span class="material-symbols-outlined ${iconColor} text-[20px] font-bold">${icon}</span>
        <span class="font-body-sm text-on-surface font-medium flex-1">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ---------- Delete Popover ----------
function confirmDelete(btn, domain) {
    const popoverRoot = document.getElementById('popover-root');
    const rect = btn.getBoundingClientRect();

    const existing = document.getElementById('delete-popover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.id = 'delete-popover';
    popover.className = 'fixed z-[101] w-[260px] bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl p-lg popover-animate pointer-events-auto';
    popover.style.top = `${rect.top - 10}px`;
    popover.style.left = `${rect.left - 275}px`;

    popover.innerHTML = `
        <div class="flex flex-col gap-xs">
            <h4 class="font-title-sm text-[16px] text-on-surface font-semibold">Remove website?</h4>
            <p class="text-body-sm text-on-surface-variant leading-normal">This website will be removed from your blocked list.</p>
            <div class="flex gap-sm mt-md">
                <button onclick="this.closest('#delete-popover').remove()" class="flex-1 h-9 rounded-xl border border-white/10 hover:bg-white/5 text-on-surface text-[13px] font-medium transition-colors">Cancel</button>
                <button onclick="executeDelete('${domain}', this)" class="flex-1 h-9 rounded-xl bg-[#EF4444] text-white text-[13px] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all">Delete</button>
            </div>
        </div>
    `;

    popoverRoot.appendChild(popover);

    const closePopover = (e) => {
        if (!popover.contains(e.target) && e.target !== btn) {
            popover.remove();
            document.removeEventListener('mousedown', closePopover);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closePopover), 10);
}

async function executeDelete(domain, popoverBtn) {
    const popover = popoverBtn.closest('#delete-popover');
    popover.remove();

    try {
        const result = await pywebview.api.remove_site(domain);
        if (!result.success) {
            showToast('Could not remove site', 'error');
            return;
        }

        const cards = document.querySelectorAll('.site-card');
        let cardToRemove = null;
        cards.forEach(card => {
            if (card.querySelector('p').textContent === domain) {
                cardToRemove = card;
            }
        });

        if (cardToRemove) {
            cardToRemove.classList.add('card-exit');
            setTimeout(() => {
                cardToRemove.remove();
                showToast('Website removed', 'success');
                updateCount();
            }, 500);
        }
    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    }
}

// ---------- Master Toggle ----------
const masterToggle = document.getElementById('master-toggle');
const masterCard = document.getElementById('master-card');
const statusPill = document.getElementById('status-pill');
const protectionTitle = document.getElementById('protection-title');
const protectionDesc = document.getElementById('protection-desc');

masterToggle.addEventListener('change', async (e) => {
    const wantActive = e.target.checked;

    try {
        const result = await pywebview.api.toggle_master();
        if (!result.success) {
            // Revert UI if backend failed (e.g. not run as admin)
            e.target.checked = !wantActive;
            showToast('Failed — run app as Administrator', 'error');
            return;
        }

        renderState(result.state);

        if (result.state.master_on) {
            showToast('Focus Mode enabled', 'success');
            setTimeout(() => showToast('Restart browser to apply changes', 'warning'), 1500);
        } else {
            showToast('Focus Mode paused', 'success');
        }
    } catch (err) {
        console.error(err);
        e.target.checked = !wantActive;
        showToast('Something went wrong', 'error');
    }
});

function applyMasterState(isActive) {
    if (isActive) {
        masterCard.classList.remove('bg-surface-container-low', 'border-white/10');
        masterCard.classList.add('bg-surface-bright', 'border-primary/30');
        statusPill.textContent = 'ACTIVE';
        statusPill.className = 'state-transition bg-primary/15 text-primary px-sm py-[4px] rounded-full font-label-caps text-[10px] tracking-widest border border-primary/30';
        updateCount();
        protectionDesc.textContent = 'Your deep work session is currently running.';
    } else {
        masterCard.classList.remove('bg-surface-bright', 'border-primary/30');
        masterCard.classList.add('bg-surface-container-low', 'border-white/10');
        statusPill.textContent = 'PAUSED';
        statusPill.className = 'state-transition bg-white/5 text-on-surface-variant px-sm py-[4px] rounded-full font-label-caps text-[10px] tracking-widest border border-white/10';
        protectionTitle.textContent = 'Focus Paused';
        protectionDesc.textContent = 'Deep work mode is currently inactive.';
    }
}

// ---------- Site Toggle ----------
async function toggleSite(toggle, url, labelId) {
    try {
        const result = await pywebview.api.toggle_site(url);
        if (!result.success) {
            toggle.checked = !toggle.checked;
            showToast('Failed — run app as Administrator', 'error');
            return;
        }
        const label = document.getElementById(labelId);
        if (label) label.textContent = toggle.checked ? 'Blocked' : 'Disabled';
        updateCount();
    } catch (err) {
        console.error(err);
        toggle.checked = !toggle.checked;
        showToast('Something went wrong', 'error');
    }
}

// ---------- Add Site ----------
async function addSite() {
    const input = document.getElementById('site-input');
    const raw = input.value.trim();
    if (!raw) return;

    const domain = raw.toLowerCase().replace('https://', '').replace('http://', '').split('/')[0];

    try {
        const result = await pywebview.api.add_site(domain);
        if (!result.success) {
            showToast(result.error || 'Site already exists', 'warning');
            return;
        }
        renderSiteCard(domain, true, true);
        input.value = '';
        showToast('Website added', 'success');
        updateCount();
    } catch (err) {
        console.error(err);
        showToast('Something went wrong', 'error');
    }
}

// ---------- Rendering ----------
let siteIdCounter = 100;

function renderSiteCard(domain, enabled, animateIn = false) {
    const list = document.getElementById('website-list');
    const card = document.createElement('div');
    siteIdCounter++;
    const labelId = `status-label-${siteIdCounter}`;

    card.className = 'site-card group bg-surface-container-low border border-white/5 rounded-xl px-lg py-md flex items-center justify-between' +
        (animateIn ? ' opacity-0 translate-y-4 scale-95 transition-all duration-500' : '');

    card.innerHTML = `
        <div class="flex items-center gap-md">
            <img class="w-9 h-9 rounded-lg" src="https://www.google.com/s2/favicons?sz=128&domain=${domain}" alt="${domain}" onerror="this.src='https://www.google.com/s2/favicons?sz=128&domain=example.com'"/>
            <div>
                <p class="font-body-md text-on-surface font-medium">${domain}</p>
                <p class="text-[12px] text-on-surface-variant/60" id="${labelId}">${enabled ? 'Blocked' : 'Disabled'}</p>
            </div>
        </div>
        <div class="flex items-center gap-md">
            <label class="relative inline-flex items-center cursor-pointer">
                <input ${enabled ? 'checked' : ''} class="site-toggle sr-only peer" type="checkbox" onchange="toggleSite(this, '${domain}', '${labelId}')"/>
                <div class="toggle-bg w-10 h-5 bg-surface-container-highest rounded-full transition-colors"></div>
                <div class="toggle-dot absolute left-[3px] top-[3px] w-3.5 h-3.5 bg-white rounded-full"></div>
            </label>
            <button onclick="confirmDelete(this, '${domain}')" class="trash-btn material-symbols-outlined text-on-surface-variant/40 p-1.5 rounded-lg text-[18px]" data-icon="delete">delete</button>
        </div>
    `;

    list.prepend(card);

    if (animateIn) {
        requestAnimationFrame(() => {
            card.classList.remove('opacity-0', 'translate-y-4', 'scale-95');
        });
    }
}

function updateCount() {
    const count = document.querySelectorAll('.site-toggle:checked').length;
    if (masterToggle.checked) {
        protectionTitle.textContent = `${count} Websites Blocked`;
    }
}

function renderState(state) {
    masterToggle.checked = state.master_on;

    const list = document.getElementById('website-list');
    list.innerHTML = '';
    // reverse so first added shows on top, matching prepend behavior
    [...state.sites].reverse().forEach(site => {
        renderSiteCard(site.url, site.enabled, false);
    });

    applyMasterState(state.master_on);
    updateCount();
}

// ---------- Initial Load ----------
async function initApp() {
    try {
        const state = await pywebview.api.get_initial_state();
        renderState(state);
    } catch (err) {
        console.error('Failed to load initial state', err);
        showToast('Failed to load saved settings', 'error');
    }
}

window.addEventListener('pywebviewready', initApp);
