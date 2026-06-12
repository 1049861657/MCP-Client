/** @typedef {{ value: string; label: string }} ModelEntry */
/** @typedef {{ name: string; type: string; apiUrl: string; apiKey: string; defaultModel: string; models: ModelEntry[] }} Provider */

export const PROVIDER_CLIPBOARD_KIND = 'mcp-client/provider';
export const PROVIDER_CLIPBOARD_VERSION = 1;

/**
 * @param {Provider} provider
 * @returns {string}
 */
export function serializeProviderForClipboard(provider) {
  const payload = {
    kind: PROVIDER_CLIPBOARD_KIND,
    version: PROVIDER_CLIPBOARD_VERSION,
    exportedAt: new Date().toISOString(),
    provider: {
      name: provider.name,
      type: provider.type,
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
      defaultModel: provider.defaultModel,
      models: (provider.models ?? []).map((model) => ({
        value: model.value,
        label: model.label,
      })),
    },
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * @param {unknown} value
 * @returns {value is ModelEntry}
 */
function isModelEntry(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  );
}

/**
 * @param {unknown} value
 * @returns {value is Provider}
 */
function isProviderShape(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.apiUrl === 'string' &&
    typeof candidate.apiKey === 'string' &&
    typeof candidate.defaultModel === 'string' &&
    Array.isArray(candidate.models) &&
    candidate.models.every(isModelEntry)
  );
}

/**
 * @param {string} text
 * @returns {Provider}
 */
export function parseProviderFromClipboard(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('剪贴板内容不是有效的 JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('剪贴板格式无效');
  }

  const envelope = /** @type {Record<string, unknown>} */ (parsed);
  if (envelope.kind !== PROVIDER_CLIPBOARD_KIND) {
    throw new Error('剪贴板内容不是提供商配置');
  }

  if (envelope.version !== PROVIDER_CLIPBOARD_VERSION) {
    throw new Error('不支持的提供商配置版本');
  }

  if (!isProviderShape(envelope.provider)) {
    throw new Error('提供商配置字段不完整');
  }

  return {
    name: envelope.provider.name.trim(),
    type: envelope.provider.type.trim(),
    apiUrl: envelope.provider.apiUrl.trim(),
    apiKey: envelope.provider.apiKey.trim(),
    defaultModel: envelope.provider.defaultModel.trim(),
    models: envelope.provider.models
      .map((model) => ({
        value: model.value.trim(),
        label: model.label.trim(),
      }))
      .filter((model) => model.value.length > 0)
      .map((model) => ({
        value: model.value,
        label: model.label || model.value,
      })),
  };
}

/**
 * @param {string} name
 * @param {string[]} existingNames
 * @returns {string}
 */
export function resolveUniqueProviderName(name, existingNames) {
  const base = name.trim() || '未命名提供商';
  if (!existingNames.includes(base)) {
    return base;
  }

  const copyName = `${base} (副本)`;
  if (!existingNames.includes(copyName)) {
    return copyName;
  }

  let index = 2;
  while (existingNames.includes(`${base} (副本 ${index})`)) {
    index += 1;
  }

  return `${base} (副本 ${index})`;
}

/**
 * @param {Provider} provider
 * @returns {Provider}
 */
export function cloneProviderForImport(provider) {
  return {
    name: provider.name,
    type: provider.type,
    apiUrl: provider.apiUrl,
    apiKey: provider.apiKey,
    defaultModel: provider.defaultModel,
    models: provider.models.map((model) => ({
      value: model.value,
      label: model.label,
    })),
  };
}
