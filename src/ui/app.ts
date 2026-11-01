// App controller: renders views and routes user actions to the engine.
import type { AccountId, GameState } from '../types';
import { initialUi, savePrefs, type UiState, type View } from './state';
import { html } from './html';
import { resetCharts, installChartHover } from './charts';
import { configureVoice, markGesture, speak, stop } from './speech';
import { header, coachBar, dashboard, budget, portfolio } from './views-main';
import { market, security } from './views-market';
import { career, business } from './views-work';
import { history, guide, newGameScreen, reportView, eventModal, eventResultModal, yearModal, confirmNewModal, tutorialCard, footer } from './views-other';
import { newGame, advanceMonth, fastForward, chooseEvent, withRng, retireEarly, checkAchievements } from '../engine/game';
import { saveToStorage, loadFromStorage, serialize, deserialize, saveFileName, clearStorage } from '../engine/save';
import { buy, sell, withdrawRetirement, positions } from '../engine/portfolio';
import { buyHome, sellHome, changeTransport, payDebt } from '../engine/finance';
import { askForPromotion, startCert, startDegree, jobOptions, applyForJob, loseJob } from '../engine/career';
import { startBusiness, openLocation, investInQuality, sellBusiness, closeBusiness } from '../engine/business';
import { getGuide, nextStep } from '../engine/coach';
import { age } from '../engine/metrics';
import { EVENT_BY_ID } from '../engine/events';
import { TUTORIAL } from '../data/guide';
import { GUIDE } from '../data/guide';

export class App {
  ui: UiState = initialUi();
  root: HTMLElement;
  private toastTimer: number | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.ui.game = loadFromStorage();
    if (this.ui.game?.gameOver) this.ui.view = 'report';
    this.applyPrefs();
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('change', (e) => this.onChange(e));
    root.addEventListener('input', (e) => this.onInput(e));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target as HTMLElement).classList.contains('clickable')) (e.target as HTMLElement).click();
      if (e.key === 'Enter' && (e.target as HTMLElement).id === 'ask-input') this.act('ask', e.target as HTMLElement);
    });
    document.addEventListener('keydown', (e) => {
      markGesture();
      const t = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if ((e.key === 'n' || e.key === 'N') && this.ui.game && !this.ui.game.pendingEvent && !this.ui.game.gameOver && !this.modalOpen()) this.act('next-month', t);
      if (e.key === 'Escape') {
        this.ui.menuOpen = this.ui.ffOpen = false;
        this.render();
      }
    });
    document.addEventListener('pointerdown', () => markGesture(), { capture: true });
    installChartHover(root);
    let resizeTimer: number | undefined;
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        // Charts are drawn at the screen width, so redraw when it changes.
        if (Math.abs(window.innerWidth - lastWidth) > 40) {
          lastWidth = window.innerWidth;
          this.render();
        }
      }, 200);
    });
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => this.ui.view === 'guide' && this.render();
    this.render();
  }

  get game(): GameState {
    return this.ui.game!;
  }

  modalOpen(): boolean {
    const g = this.ui.game;
    return !!(this.ui.eventResult || this.ui.confirmNew || (g && (g.pendingEvent || (this.ui.showYear && g.pendingYearSummary))));
  }

  applyPrefs() {
    const p = this.ui.prefs;
    configureVoice({ on: p.voiceOn, name: p.voiceName, rate: p.voiceRate });
    document.documentElement.dataset.theme = p.theme === 'auto' ? '' : p.theme;
    if (p.theme === 'auto') delete document.documentElement.dataset.theme;
    if (this.ui.game) this.ui.game.settings.pauseOnAllEvents = p.pauseOnAllEvents;
  }

  toast(text: string, kind: 'good' | 'bad' | 'info' = 'info') {
    this.ui.toast = { text, kind };
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.ui.toast = null;
      const el = this.root.querySelector('.toast');
      el?.remove();
    }, 4500);
  }

  persist() {
    if (this.ui.game) saveToStorage(this.ui.game);
  }

  render() {
    resetCharts();
    const g = this.ui.game;
    let body;
    if (!g) {
      body = newGameScreen(!!loadFromStorage());
    } else {
      const v = this.ui.view;
      const content =
        v === 'dashboard' ? dashboard(g)
        : v === 'budget' ? budget(g)
        : v === 'market' ? market(g, this.ui)
        : v === 'security' ? security(g, this.ui)
        : v === 'portfolio' ? portfolio(g, this.ui)
        : v === 'career' ? career(g)
        : v === 'business' ? business(g)
        : v === 'history' ? history(g, this.ui)
        : v === 'guide' ? guide(g, this.ui)
        : reportView(g);
      let modal = html``;
      if (this.ui.confirmNew) modal = confirmNewModal();
      else if (this.ui.eventResult) modal = eventResultModal(this.ui);
      else if (this.ui.showYear && g.pendingYearSummary) modal = yearModal(g, g.pendingYearSummary);
      else if (g.pendingEvent && v !== 'security') modal = eventModal(g);
      const peekBanner =
        g.pendingEvent && v === 'security'
          ? html`<div class="peek-banner">Researching for a decision: <b>${g.pendingEvent.title}</b> <button class="btn small primary" data-action="back-to-event">Back to the decision</button></div>`
          : html``;
      body = html`${header(g, this.ui)}<main class="main">${peekBanner}${g.gameOver ? '' : coachBar(g)}<div class="view view-${v}">${content}</div></main>${footer()}${!g.gameOver && !this.modalOpen() ? tutorialCard(g, this.ui) : ''}${modal}`;
    }
    const scrollY = window.scrollY;
    this.root.innerHTML = html`${body}${this.ui.toast ? html`<div class="toast ${this.ui.toast.kind}" role="status">${this.ui.toast.text}</div>` : ''}`.value;
    window.scrollTo(0, scrollY);
    const focusEl = this.root.querySelector('[autofocus]') as HTMLElement | null;
    focusEl?.focus();
  }

  private nav(view: View) {
    if (view !== this.ui.view) {
      this.ui.prevView = this.ui.view === 'security' ? this.ui.prevView : this.ui.view;
      this.ui.view = view;
      window.scrollTo(0, 0);
    }
  }

  /** After a turn or fast-forward: save, speak, advance tutorial. */
  private afterTurn(messages: string[] = []) {
    const g = this.game;
    if (g.pendingYearSummary) this.ui.showYear = true;
    if (g.gameOver) {
      this.ui.view = 'report';
      this.ui.showYear = false;
    }
    this.checkTutorial();
    this.persist();
    const important = messages.find((m) => /Achievement|Promoted|laid off|Job found|graduated|first profitable/.test(m));
    if (important) this.toast(important, /laid off/.test(important) ? 'bad' : 'good');
    const tip = nextStep(g);
    if (g.pendingEvent?.lesson && this.ui.prefs.voiceOn) speak(`${g.pendingEvent.title}. ${g.pendingEvent.text}`);
    else if (tip.text !== this.ui.lastSpoken) {
      this.ui.lastSpoken = tip.text;
      speak(tip.text);
    }
  }

  private checkTutorial() {
    const g = this.ui.game;
    if (!g || this.ui.prefs.tutorialDone) return;
    const step = TUTORIAL[g.tutorialStep];
    if (step?.done && step.done(g)) g.tutorialStep++;
    if (g.tutorialStep >= TUTORIAL.length) this.finishTutorial();
  }

  private finishTutorial() {
    this.ui.prefs.tutorialDone = true;
    savePrefs(this.ui.prefs);
  }

  private onClick(e: Event) {
    markGesture();
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target || target.tagName === 'INPUT') {
      if (!(e.target as HTMLElement).closest('.ff') && (this.ui.menuOpen || this.ui.ffOpen)) {
        this.ui.menuOpen = this.ui.ffOpen = false;
        this.render();
      }
      return;
    }
    if ((target as HTMLButtonElement).disabled) return;
    if (target.tagName === 'SUMMARY') {
      // let <details> toggle natively; remember which topic is open
      this.ui.openTopic = this.ui.openTopic === target.dataset.id ? '' : target.dataset.id ?? '';
      return;
    }
    e.preventDefault();
    this.act(target.dataset.action!, target);
  }

  private onChange(e: Event) {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    if (el.dataset.actionChange === 'import') return this.importFile(el as HTMLInputElement);
    const g = this.ui.game;
    const parse = (v: string, type?: string): unknown => (type === 'number' ? Number(v) : type === 'bool' ? (el as HTMLInputElement).checked : v);
    if (el.dataset.bind && g) {
      const path = el.dataset.bind.split('.');
      let obj: Record<string, unknown> = g as unknown as Record<string, unknown>;
      for (const k of path.slice(0, -1)) obj = obj[k] as Record<string, unknown>;
      obj[path[path.length - 1]] = parse(el.value, el.dataset.type);
      this.checkTutorial();
      this.persist();
      this.render();
    } else if (el.dataset.bindUi) {
      (this.ui as unknown as Record<string, unknown>)[el.dataset.bindUi] = el.value;
      this.render();
    } else if (el.dataset.pref) {
      (this.ui.prefs as unknown as Record<string, unknown>)[el.dataset.pref] = parse(el.value, el.dataset.type);
      savePrefs(this.ui.prefs);
      this.applyPrefs();
      if (el.dataset.pref === 'voiceOn' && this.ui.prefs.voiceOn) speak(`Voice on. I'm ${GUIDE.name}.`);
      this.render();
    } else if (el.dataset.biz && g) {
      const b = g.businesses.find((x) => x.id === el.dataset.biz);
      if (!b) return;
      const f = el.dataset.field!;
      if (f === 'involvement') b.involvement = el.value as typeof b.involvement;
      else if (f === 'pricing') b.pricing = Number(el.value);
      else if (f === 'marketing') b.marketing = Math.max(0, Number(el.value) || 0);
      else if (f === 'ownerDraw') b.ownerDraw = Math.max(0, Number(el.value) || 0);
      this.persist();
      this.render();
    } else if (el.dataset.calc) {
      (this.ui.calc as unknown as Record<string, number>)[el.dataset.calc] = Math.max(0, Number(el.value) || 0);
      this.render();
    }
  }

  private onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    // Live label updates for range sliders without a full re-render.
    if (el.type === 'range' && el.parentElement?.querySelector('b')) {
      const b = el.parentElement.querySelector('b')!;
      if (el.dataset.bind === 'budget.k401Pct') b.textContent = `${el.value}%`;
      else if (el.dataset.bind === 'budget.extraDebtPayment') b.textContent = `$${Number(el.value).toLocaleString()}`;
      else if (el.dataset.pref === 'voiceRate') b.textContent = `${Number(el.value).toFixed(1)}×`;
    }
    if (el.dataset.bindUi === 'marketSearch') {
      this.ui.marketSearch = el.value;
      const pos = el.selectionStart;
      this.render();
      const again = this.root.querySelector('[data-bind-ui="marketSearch"]') as HTMLInputElement | null;
      if (again) {
        again.focus();
        again.setSelectionRange(pos, pos);
      }
    }
  }

  private val(id: string): string {
    return (this.root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '';
  }

  private result(msg: string, ok = true) {
    this.toast(msg, ok ? 'good' : 'bad');
    checkAchievements(this.game);
    this.checkTutorial();
    this.persist();
  }

  act(action: string, el: HTMLElement) {
    const d = el.dataset;
    const g = this.ui.game;
    switch (action) {
      // ----- navigation & app
      case 'nav':
        this.ui.menuOpen = this.ui.ffOpen = false;
        this.nav(d.view as View);
        break;
      case 'back':
        this.nav(this.ui.prevView === 'security' ? 'market' : this.ui.prevView);
        break;
      case 'open-security':
        this.ui.symbol = d.symbol!;
        this.nav('security');
        break;
      case 'peek-security':
        this.ui.symbol = d.symbol!;
        this.nav('security');
        break;
      case 'back-to-event':
        this.nav(this.ui.prevView);
        break;
      case 'toggle-menu':
        this.ui.menuOpen = !this.ui.menuOpen;
        this.ui.ffOpen = false;
        break;
      case 'toggle-ff':
        this.ui.ffOpen = !this.ui.ffOpen;
        this.ui.menuOpen = false;
        break;
      case 'chart-range':
        this.ui.chartRange = d.range as UiState['chartRange'];
        break;
      case 'history-range':
        this.ui.historyRange = d.range as UiState['historyRange'];
        break;
      case 'speak':
        speak(d.text ?? '', true);
        return;
      case 'start-game': {
        const name = this.val('ng-name') || 'Alex';
        const bg = (this.root.querySelector('input[name="ng-bg"]:checked') as HTMLInputElement)?.value ?? 'grad';
        const tr = (this.root.querySelector('input[name="ng-career"]:checked') as HTMLInputElement)?.value ?? 'software';
        const seedRaw = this.val('ng-seed');
        this.ui.game = newGame({ name, backgroundId: bg, trackId: tr, seed: seedRaw ? Math.abs(Math.floor(Number(seedRaw))) || undefined : undefined });
        if (this.ui.game.career.trackId !== tr) this.toast('That career needs a degree, so you start in retail management. You can study for a degree later.', 'info');
        this.ui.view = 'dashboard';
        this.ui.prefs.tutorialDone = false;
        savePrefs(this.ui.prefs);
        this.applyPrefs();
        this.persist();
        speak(TUTORIAL[0].text);
        break;
      }
      case 'continue':
        this.ui.game = loadFromStorage();
        this.ui.view = this.ui.game?.gameOver ? 'report' : 'dashboard';
        this.applyPrefs();
        break;
      case 'new-game':
        this.ui.menuOpen = false;
        if (g && !g.gameOver) this.ui.confirmNew = true;
        else this.resetToNew();
        break;
      case 'confirm-new':
        this.ui.confirmNew = false;
        this.resetToNew();
        break;
      case 'cancel-new':
        this.ui.confirmNew = false;
        break;
      case 'export':
        this.ui.menuOpen = false;
        if (g) this.exportSave(g);
        break;
      case 'restart-tutorial':
        this.ui.menuOpen = false;
        if (g) g.tutorialStep = 0;
        this.ui.prefs.tutorialDone = false;
        savePrefs(this.ui.prefs);
        this.nav('dashboard');
        break;
      case 'tutorial-next':
        if (g) {
          g.tutorialStep++;
          if (g.tutorialStep >= TUTORIAL.length) this.finishTutorial();
          else {
            const step = TUTORIAL[g.tutorialStep];
            this.nav(step.view as View);
            speak(step.text);
          }
          this.persist();
        }
        break;
      case 'tutorial-skip':
        this.finishTutorial();
        stop();
        break;
      // ----- turns
      case 'next-month': {
        if (!g || g.pendingEvent || g.gameOver) break;
        const r = advanceMonth(g);
        this.afterTurn(r.messages);
        break;
      }
      case 'ff': {
        if (!g) break;
        this.ui.ffOpen = false;
        g.settings.pauseOnAllEvents = this.ui.prefs.pauseOnAllEvents;
        const months = Number(d.months);
        const before = g.month;
        const res = fastForward(g, months);
        const yrs = Math.floor((g.month - before) / 12);
        this.toast(res.stoppedFor === 'event' ? `Fast-forwarded ${g.month - before} months. Stopped for a big decision.` : res.stoppedFor === 'gameOver' ? 'You reached retirement!' : `Fast-forwarded ${yrs >= 1 ? `${yrs} year${yrs > 1 ? 's' : ''}` : `${g.month - before} months`}.`);
        this.ui.showYear = months <= 12 && !!g.pendingYearSummary;
        if (g.gameOver) this.ui.view = 'report';
        this.checkTutorial();
        this.persist();
        break;
      }
      case 'choose': {
        if (!g?.pendingEvent) break;
        const ev = g.pendingEvent;
        const def = EVENT_BY_ID[ev.defId];
        const choice = def?.choices[Number(d.index)];
        const lines = chooseEvent(g, Number(d.index));
        this.ui.eventResult = { title: choice ? choice.label : ev.title, lines: lines.length ? lines : ['Done.'] };
        if (this.ui.prefs.voiceOn) speak(lines.join(' '));
        this.persist();
        break;
      }
      case 'close-result':
        this.ui.eventResult = null;
        break;
      case 'close-year':
        this.ui.showYear = false;
        break;
      case 'retire-early':
        if (g) {
          this.toast(retireEarly(g), 'good');
          this.ui.view = 'report';
          this.persist();
        }
        break;
      // ----- budget
      case 'set-lifestyle':
        if (g) {
          g.budget.lifestyle = d.id as GameState['budget']['lifestyle'];
          this.persist();
        }
        break;
      case 'buy-home':
        if (g) {
          const msg = buyHome(g, this.val('home-option'), Number(this.val('home-down')));
          this.result(msg, !!g.home);
        }
        break;
      case 'sell-home':
        if (g) this.result(sellHome(g, this.val('sell-rent')));
        break;
      case 'change-transport':
        if (g) {
          const before = g.budget.transport;
          const msg = changeTransport(g, this.val('transport-select'), (this.root.querySelector('#transport-finance') as HTMLInputElement)?.checked);
          this.result(msg, g.budget.transport !== before);
        }
        break;
      case 'pay-debt':
        if (g) this.result(payDebt(g, d.id!, g.cash));
        break;
      // ----- investing
      case 'trade-fill': {
        if (!g) break;
        const input = this.root.querySelector('#trade-amount') as HTMLInputElement | null;
        if (input) input.value = String(Math.floor(g.cash * Number(d.pct)));
        return;
      }
      case 'trade-buy':
      case 'trade-sell': {
        if (!g) break;
        const amount = Number(this.val('trade-amount'));
        const acct = (this.val('trade-account') || 'taxable') as AccountId;
        if (action === 'trade-buy') {
          const r = buy(g, d.symbol!, acct, amount);
          this.result(r.message, r.ok);
        } else {
          const owned = positions(g).filter((p) => p.symbol === d.symbol && p.account !== 'k401');
          const pos = owned.find((p) => p.account === acct) ?? owned[0];
          if (!pos) this.result('You do not own that here.', false);
          else {
            const r = sell(g, d.symbol!, pos.account, amount > 0 ? amount : 'all');
            this.result(r.message, r.ok);
          }
        }
        break;
      }
      case 'sell-all':
        if (g) {
          const r = sell(g, d.symbol!, d.account as AccountId, 'all');
          this.result(r.message, r.ok);
        }
        break;
      case 'reinvest':
        if (g) {
          const a = d.account as AccountId;
          const sym = a === 'k401' ? g.budget.k401Fund : 'VOO';
          const r = buy(g, sym, a, g.accounts[a].cash, { fromAccountCash: true });
          this.result(r.message, r.ok);
        }
        break;
      case 'withdraw':
        if (g) {
          const a = d.account as 'k401' | 'roth';
          const r = withdrawRetirement(g, a, g.accounts[a].cash, age(g));
          this.result(r.message, r.ok);
        }
        break;
      case 'add-auto':
        if (g) {
          const amount = Number(this.val('auto-amount'));
          if (!(amount > 0)) {
            this.result('Enter a monthly amount.', false);
            break;
          }
          g.budget.autoInvest.push({ id: `rule-${Date.now()}`, symbol: this.val('auto-symbol'), account: this.val('auto-account') as AccountId, amount: amount / g.market.cpi });
          this.result(`Every month you will now invest $${amount} in ${this.val('auto-symbol')}.`);
        }
        break;
      case 'remove-auto':
        if (g) {
          g.budget.autoInvest = g.budget.autoInvest.filter((r) => r.id !== d.id);
          this.persist();
        }
        break;
      // ----- career
      case 'set-effort':
        if (g) {
          g.career.effort = d.id as GameState['career']['effort'];
          this.persist();
        }
        break;
      case 'ask-promo':
        if (g) {
          const r = withRng(g, (rng) => askForPromotion(g, rng));
          this.result(r.message, r.ok);
        }
        break;
      case 'start-cert':
        if (g) this.result(startCert(g, d.id!));
        break;
      case 'start-degree':
        if (g) this.result(startDegree(g));
        break;
      case 'apply-job':
        if (g) {
          const opt = jobOptions(g)[Number(d.index)];
          if (opt) {
            const r = withRng(g, (rng) => applyForJob(g, rng, opt));
            this.result(r.message, r.ok);
          }
        }
        break;
      case 'quit-job':
        if (g && confirm('Quit your job? You will not get unemployment benefits.')) this.result(loseJob(g, false), false);
        break;
      // ----- business
      case 'biz-start':
        if (g) {
          const n = g.businesses.length;
          const msg = withRng(g, (rng) => startBusiness(g, rng, d.type!, d.loan === '1'));
          this.result(msg, g.businesses.length > n);
        }
        break;
      case 'biz-staff':
        if (g) {
          const b = g.businesses.find((x) => x.id === d.id);
          if (b) b.staff = Math.max(0, b.staff + Number(d.delta));
          this.persist();
        }
        break;
      case 'biz-location':
        if (g) {
          const b = g.businesses.find((x) => x.id === d.id);
          if (b) this.result(openLocation(g, b));
        }
        break;
      case 'biz-quality':
        if (g) {
          const b = g.businesses.find((x) => x.id === d.id);
          if (b) this.result(investInQuality(g, b));
        }
        break;
      case 'biz-sell':
        if (g && confirm('Sell this business at its estimated value?')) this.result(sellBusiness(g, d.id!));
        break;
      case 'biz-close':
        if (g && confirm('Close this business? You only recover a little of what you put in.')) this.result(closeBusiness(g, d.id!), false);
        break;
      // ----- guide
      case 'ask': {
        if (!g) break;
        const q = this.val('ask-input');
        if (!q.trim()) break;
        getGuide()
          .answer(g, q)
          .then((a) => {
            this.ui.askAnswer = a;
            speak(a);
            this.render();
          });
        return;
      }
      case 'open-topic':
        return;
      default:
        console.warn('Unknown action', action);
        return;
    }
    this.render();
  }

  private resetToNew() {
    clearStorage();
    this.ui.game = null;
    this.ui.view = 'dashboard';
    stop();
  }

  private exportSave(g: GameState) {
    const blob = new Blob([serialize(g)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName(g);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast('Save file downloaded.', 'good');
  }

  private importFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        this.ui.game = deserialize(text);
        this.ui.view = this.ui.game.gameOver ? 'report' : 'dashboard';
        this.ui.menuOpen = false;
        this.applyPrefs();
        this.persist();
        this.toast(`Loaded ${this.ui.game.name}'s game.`, 'good');
      } catch (err) {
        this.toast((err as Error).message, 'bad');
      }
      this.render();
    });
  }
}
