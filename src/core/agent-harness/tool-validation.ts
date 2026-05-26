import { OpenAI as OpenAIClient } from 'openai';
import { Logger } from '../../utils/logger.js';
import { mcpClient } from '../mcp/index.js';

export interface ToolValidationContext {
  enableParamValidation: boolean;
  fallbackClient: OpenAIClient;
  fallbackModel: string;
  getValidationClient?: (providerName: string) => { client: OpenAIClient; model: string } | undefined;
}

function resolveValidationClient(
  context: ToolValidationContext,
  providerName: string
): { client: OpenAIClient; model: string } {
  const resolved = context.getValidationClient?.(providerName);
  if (resolved) {
    return resolved;
  }
  return { client: context.fallbackClient, model: context.fallbackModel };
}

/**
 * 验证 executeApi 工具参数（LLM 辅助校验）
 */
export async function verifyToolArguments(
  context: ToolValidationContext,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ isValid: boolean; message: string }> {
  if (!context.enableParamValidation || toolName !== 'executeApi') {
    return { isValid: true, message: '' };
  }

  try {
    const getApiDetailsCode = mcpClient.findCodeNameByToolName('getApiDetails');
    if (!getApiDetailsCode) {
      return { isValid: true, message: '' };
    }
    const toolResult = await mcpClient.callTool<{ content: Array<{ text?: string }> }>(
      getApiDetailsCode,
      { apiId: args.apiId }
    );

    let apiParameters: unknown[] = [];
    try {
      const apiDetailText = toolResult.content[0]?.text || '';
      const apiDetailMatch = apiDetailText.match(/\{[\s\S]*\}/);

      if (apiDetailMatch) {
        const apiDetail = JSON.parse(apiDetailMatch[0]) as {
          parameters?: Array<{ name: string }>;
        };
        if (apiDetail?.parameters && Array.isArray(apiDetail.parameters)) {
          const params = args.params as Record<string, unknown> | undefined;
          if (params) {
            const providedParamNames = Object.keys(params);
            apiParameters = apiDetail.parameters.filter(param =>
              providedParamNames.includes(param.name)
            );
          } else {
            apiParameters = apiDetail.parameters;
          }
        }
      }
    } catch (e) {
      Logger.warn('OPENAI', `解析API详情参数失败: ${e}`);
    }

    const params = args.params as Record<string, unknown> | undefined;
    if ((!params || Object.keys(params).length === 0) &&
        (!apiParameters || apiParameters.length === 0)) {
      return { isValid: true, message: '' };
    }

    let messages = [
      {
        role: 'system' as const,
        content: '你是一个工具参数验证助手。你的任务是验证提供的参数是否满足工具要求，请懂得灵活变通，不要死板。只回答\'是\'或\'否\'，如果是\'否\',简要说明原因。'
      },
      {
        role: 'user' as const,
        content: `参数：${JSON.stringify(params)}--工具参数要求：${JSON.stringify(apiParameters)}`
      }
    ];

    if (args.apiId === 'doSqlQuery') {
      messages = [
        {
          role: 'system' as const,
          content: '你是一个 SQL 验证助手，任务是验证 AI生成的SQL 语句中是否合规。不合规指的是存在占位模版或明显不符合参数名含义，只回答\'是\'或\'否\'，如果是\'否\'，简要说明原因。'
        },
        {
          role: 'user' as const,
          content: String((params as { sql?: string })?.sql ?? '')
        }
      ];
    }

    const { client, model } = args.apiId === 'doSqlQuery'
      ? resolveValidationClient(context, '火山引擎')
      : resolveValidationClient(context, 'Deepseek');

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_tokens: 100
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';

    if (content.startsWith('是')) {
      return { isValid: true, message: '' };
    }

    const errorMessage = content.replace(/^否[。：:,，、\s]*/i, '').trim();
    return { isValid: false, message: errorMessage || '参数不满足要求' };
  } catch (error) {
    Logger.error('OPENAI', '验证工具参数失败:', error);
    return { isValid: true, message: '' };
  }
}
