/** 将 MCP tools/call 返回值格式化为可读文本（Info 试跑 / 调试） */
export function formatMcpToolResult(result: unknown): string {
  if (result && typeof result === 'object' && 'content' in result) {
    const content = (result as { content?: unknown }).content;
    if (Array.isArray(content)) {
      const textParts = content
        .filter(
          (item): item is { type: string; text?: string } =>
            typeof item === 'object' &&
            item !== null &&
            (item as { type?: string }).type === 'text'
        )
        .map((item) =>
          typeof item.text === 'string' ? item.text : JSON.stringify(item)
        );
      if (textParts.length > 0) {
        return textParts.join('\n');
      }
    }
  }
  return JSON.stringify(result, null, 2);
}
