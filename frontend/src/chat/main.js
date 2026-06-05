import { mountNavbar } from '../shared/navbar.js';
import { createChatApp } from './core.js';
import { mountChatToolbarIcons } from './icons.js';
import { createChatUi } from './ui/minimal-ui.js';
import { mountChatModals } from './ui/modal-host.js';
import { mountPlanningPanel } from './ui/planning-panel.js';
import { registerPlanningPanelOpener } from './todo-card-view.js';
import './style.css';

mountChatModals();
mountNavbar();
mountChatToolbarIcons();

/** @type {object | null} */
let appRef = null;

const { ui, renderers } = createChatUi(() => appRef);
const planningPanel = mountPlanningPanel(() => appRef);
registerPlanningPanelOpener(planningPanel.openPlanningSnapshot);
Object.assign(ui, planningPanel);
const app = createChatApp({ ui, renderers });
appRef = app;

app.init().catch((error) => {
  console.error('[chat] 初始化失败:', error);
});
