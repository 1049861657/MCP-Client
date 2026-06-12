/**

 * Info 页 MCP 工具列表（启用开关 + 参数展开 + 试运行入口）

 */



import { openToolTestDrawer } from './tool-test-drawer.js';



/** @typedef {{ name: string; codeName?: string; description: string; parameters?: ToolParameter[] }} ToolInfo */

/** @typedef {{ name: string; type: string; description: string; required: boolean }} ToolParameter */



const ICON_PLAY =

  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

const ICON_CHEV =

  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';



/** @type {Set<number>} */

const expanded = new Set();



/**

 * @param {Record<string, boolean>} prefs

 * @param {string} toolName

 */

/** 与后端 ToolPolicyService.isToolEnabled 语义一致（未写入 preference 视为启用） */
export function isToolEnabled(prefs, toolName) {

  if (prefs[toolName] === undefined) {

    return true;

  }

  return prefs[toolName];

}



/**

 * @param {ToolInfo[]} tools

 * @param {Record<string, boolean>} prefs

 */

export function countEnabledTools(tools, prefs) {

  const enabled = tools.filter((t) => isToolEnabled(prefs, t.name)).length;

  return { enabled, total: tools.length, ratio: `${enabled}/${tools.length}` };

}



/**

 * @param {ToolInfo} tool

 */

function buildParamsBlock(tool) {

  if (!tool.parameters?.length) {

    return '<div class="param-empty">无参数</div>';

  }

  const rows = tool.parameters

    .map(

      (p) => `<tr>

        <td>${p.name}</td>

        <td><span class="type-tag">${p.type}</span></td>

        <td>${p.description}</td>

        <td class="${p.required ? 'param-required' : 'param-optional'}">${p.required ? '是' : '否'}</td>

      </tr>`

    )

    .join('');

  return `<table class="param-table">

    <thead><tr><th>参数</th><th>类型</th><th>说明</th><th>必填</th></tr></thead>

    <tbody>${rows}</tbody>

  </table>`;

}



/**

 * @param {HTMLElement} container

 * @param {{

 *   serverId: string;

 *   tools: ToolInfo[];

 *   preferences: Record<string, boolean>;

 *   onPreferencesChange: (prefs: Record<string, boolean>) => Promise<void>;

 * }} options

 */

export function renderToolsPanel(container, options) {

  const { serverId, tools, preferences, onPreferencesChange } = options;

  container.innerHTML = '';



  if (!tools.length) {

    container.innerHTML = '<div class="void-box">该服务器未提供工具</div>';

    return;

  }



  tools.forEach((tool, index) => {

    const enabled = isToolEnabled(preferences, tool.name);

    const isOpen = expanded.has(index);



    const card = document.createElement('article');

    card.className = `tool-card${enabled ? '' : ' off'}${isOpen ? ' expanded' : ''}`;



    card.innerHTML = `

      <div class="tool-card-head">

        <div class="tool-card-toggle">

          <label class="sw" onclick="event.stopPropagation()" data-requires-auth>

            <input type="checkbox" data-tool-enable="${index}" ${enabled ? 'checked' : ''}>

            <span class="track"></span>

          </label>

        </div>

        <div class="tool-card-main" data-expand="${index}">

          <div class="tool-card-title">

            <span class="tool-card-name">${tool.name}</span>

            ${tool.codeName ? `<span class="tool-card-fn">${tool.codeName}</span>` : ''}

          </div>

          <p class="tool-card-desc">${tool.description}</p>

        </div>

        <div class="tool-card-actions">

          <button type="button" class="tool-action-btn test" data-test="${index}" data-requires-auth title="试运行" aria-label="试运行">${ICON_PLAY}</button>

          <button type="button" class="tool-action-btn expand tool-expand-icon" data-expand-btn="${index}" title="查看参数" aria-label="查看参数">${ICON_CHEV}</button>

        </div>

      </div>

      <div class="tool-card-body">${isOpen ? buildParamsBlock(tool) : ''}</div>

    `;



    container.appendChild(card);

  });



  container.querySelectorAll('[data-tool-enable]').forEach((input) => {

    if (!(input instanceof HTMLInputElement)) {

      return;

    }

    input.addEventListener('change', () => {

      const idx = Number(input.dataset.toolEnable);

      const tool = tools[idx];

      if (!tool) {

        return;

      }

      const next = { ...preferences, [tool.name]: input.checked };

      void onPreferencesChange(next);

    });

  });



  const toggleExpand = (index) => {

    if (expanded.has(index)) {

      expanded.delete(index);

    } else {

      expanded.add(index);

    }

    renderToolsPanel(container, options);

  };



  container.querySelectorAll('[data-expand]').forEach((el) => {

    el.addEventListener('click', () => toggleExpand(Number(el.dataset.expand)));

  });



  container.querySelectorAll('[data-expand-btn]').forEach((btn) => {

    btn.addEventListener('click', (event) => {

      event.stopPropagation();

      toggleExpand(Number(btn.dataset.expandBtn));

    });

  });



  container.querySelectorAll('[data-test]').forEach((btn) => {

    btn.addEventListener('click', (event) => {

      event.stopPropagation();

      const idx = Number(btn.dataset.test);

      const tool = tools[idx];

      if (tool) {

        openToolTestDrawer(serverId, tool);

      }

    });

  });

}



export function resetToolsPanelState() {

  expanded.clear();

}


