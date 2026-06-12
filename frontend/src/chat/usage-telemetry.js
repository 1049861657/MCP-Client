/**
 * LLM token meter (decoupled from tool_call_result).
 * step_usage: per-round cumulative; usage event: final total.
 */

import { escapeAttr } from '../shared/escape-html.js';

/**
 * @param {number} n
 * @returns {string}
 */
function formatTokenCount(n) {
  if (!Number.isFinite(n) || n < 0) {
    return '0';
  }
  return Math.round(n).toLocaleString('en-US');
}

/**
 * @param {{ totalTokens?: number, promptTokens?: number, completionTokens?: number }} usage
 * @returns {string}
 */
function buildUsageTitle(usage) {
  if (!usage?.totalTokens) {
    return '';
  }
  const parts = [];
  if (usage.promptTokens) {
    parts.push(`In ${formatTokenCount(usage.promptTokens)}`);
  }
  if (usage.completionTokens) {
    parts.push(`Out ${formatTokenCount(usage.completionTokens)}`);
  }
  if (parts.length === 0) {
    return `Total ${formatTokenCount(usage.totalTokens)} tokens`;
  }
  return `${parts.join(' · ')} · ${formatTokenCount(usage.totalTokens)} total`;
}

/**
 * @param {HTMLElement} container
 * @param {'streaming' | 'done'} phase
 */
function setTokenInfoPhase(container, phase) {
  container.classList.toggle('token-info--streaming', phase === 'streaming');
  container.classList.toggle('token-info--done', phase === 'done');
}

/**
 * @param {number} round
 * @param {number} stepTok
 * @returns {string}
 */
function buildStepTitle(round, stepTok) {
  return `Model pass ${round} · +${formatTokenCount(stepTok)} tokens`;
}

/**
 * @param {HTMLElement | null} messageEl
 * @param {{ round: number, step: { totalTokens?: number, promptTokens?: number, completionTokens?: number }, cumulative: { totalTokens?: number, promptTokens?: number, completionTokens?: number } }} payload
 */
export function applyStepUsageToMessage(messageEl, payload) {
  const tokenInfo = messageEl?.querySelector('.token-info');
  if (!tokenInfo || !payload?.cumulative?.totalTokens) {
    return;
  }

  const cumulative = payload.cumulative.totalTokens;
  const stepTok = payload.step?.totalTokens ?? 0;
  const round = payload.round;
  const title = buildUsageTitle(payload.cumulative);
  const showIncrement = round > 0 && stepTok > 0;

  if (showIncrement) {
    tokenInfo.innerHTML = `
      <span class="token-meta token-meta--split" role="status" title="${escapeAttr(title)}">
        <span class="token-meta__count">${formatTokenCount(cumulative)}</span>
        <span class="token-meta__sep" aria-hidden="true">·</span>
        <span class="token-meta__delta" title="${escapeAttr(buildStepTitle(round, stepTok))}">+${formatTokenCount(stepTok)}</span>
      </span>
    `;
  } else {
    tokenInfo.innerHTML = `
      <span class="token-meta" role="status" title="${escapeAttr(title)}">
        <span class="token-meta__count">${formatTokenCount(cumulative)}</span>
        <span class="token-meta__label">tokens</span>
      </span>
    `;
  }

  setTokenInfoPhase(tokenInfo, 'streaming');
}

/**
 * @param {HTMLElement | null} messageEl
 * @param {{ totalTokens?: number, promptTokens?: number, completionTokens?: number, elapsedTime?: string }} usageData
 */
export function applyFinalUsageToMessage(messageEl, usageData) {
  const tokenInfo = messageEl?.querySelector('.token-info');
  if (!tokenInfo || !usageData?.totalTokens) {
    return;
  }

  const title = buildUsageTitle(usageData);
  tokenInfo.innerHTML = `
    <span class="token-meta token-meta--final" role="status" title="${escapeAttr(title)}">
      <span class="token-meta__count">${formatTokenCount(usageData.totalTokens)}</span>
      <span class="token-meta__label">tokens</span>
    </span>
  `;
  setTokenInfoPhase(tokenInfo, 'done');
}
