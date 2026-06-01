import { mountNavbar } from '../shared/navbar.js';
import { createChatApp } from './core.js';
import { mountChatToolbarIcons } from './icons.js';
import { createChatUi } from './ui/minimal-ui.js';
import { mountChatModals } from './ui/modal-host.js';
import './style.css';

mountChatModals();
mountNavbar();
mountChatToolbarIcons();

/** @type {object | null} */
let appRef = null;

const { ui, renderers } = createChatUi(() => appRef);
const app = createChatApp({ ui, renderers });
appRef = app;

app.init().catch((error) => {
  console.error('[chat] 初始化失败:', error);
});
