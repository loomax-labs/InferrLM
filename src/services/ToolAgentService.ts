import { onlineModelService, type ChatMessage, type OnlineModelRequestOptions } from './OnlineModelService';
import { toolExecutor } from './tools/ToolExecutor';
import { toolRegistry, type ToolCall } from './tools/ToolRegistry';

export type ToolAgentCallbacks = {
  onStatus?: (status: string) => void;
};

class ToolAgentService {
  private async sendWithTools(
    provider: string,
    messages: ChatMessage[],
    options: OnlineModelRequestOptions,
  ) {
    const tools = toolRegistry.getAllTools();
    const base = provider.includes('_clone_') ? provider.split('_clone_')[0] : provider;

    if (base === 'gemini') {
      return onlineModelService.sendGeminiWithTools(messages, tools, options, undefined, provider);
    }
    if (base === 'chatgpt') {
      return onlineModelService.sendOpenAIWithTools(messages, tools, options, undefined, provider);
    }
    if (base === 'claude') {
      return onlineModelService.sendClaudeWithTools(messages, tools, options, undefined, provider);
    }

    throw new Error('unsupported_provider');
  }

  async run(
    provider: string,
    messages: ChatMessage[],
    options: OnlineModelRequestOptions = {},
    callbacks: ToolAgentCallbacks = {},
  ): Promise<{ messages: ChatMessage[]; finalText: string }> {
    const loopMessages: any[] = [...messages];
    const base = provider.includes('_clone_') ? provider.split('_clone_')[0] : provider;

    if (!toolRegistry.hasTools()) {
      const finalText = await onlineModelService.sendMessage(provider, loopMessages, options);
      return {
        messages: [
          ...loopMessages,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: finalText,
          },
        ],
        finalText,
      };
    }

    let iteration = 0;
    while (!toolExecutor.hasReachedLimit(iteration)) {
      iteration += 1;
      callbacks.onStatus?.(`tool_loop_${iteration}`);
      const response = await this.sendWithTools(provider, loopMessages, options);

      if (response.toolCalls && response.toolCalls.length > 0) {
        const results = await toolExecutor.executeAll(response.toolCalls);
        const toolMap = new Map<string, ToolCall>();
        for (const toolCall of response.toolCalls) {
          toolMap.set(toolCall.id, toolCall);
        }

        if (base === 'gemini') {
          loopMessages.push({
            id: `assistant-tool-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: JSON.stringify({
              type: 'gemini_tool_use_response',
              rawParts: (response as any).rawParts || [],
            }),
          });
        } else if (base === 'claude') {
          loopMessages.push({
            id: `assistant-tool-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: JSON.stringify({
              type: 'tool_use_response',
              rawContent: (response as any).rawContent || [],
            }),
          });
        } else {
          loopMessages.push({
            id: `assistant-tool-${Date.now()}-${iteration}`,
            role: 'assistant',
            content: response.fullResponse || '',
          });
        }

        for (const result of results) {
          const toolCall = toolMap.get(result.toolCallId);
          if (base === 'gemini') {
            loopMessages.push({
              id: `tool-result-${result.toolCallId}`,
              role: 'user',
              toolCallId: result.toolCallId,
              content: JSON.stringify({
                type: 'function_response',
                id: result.toolCallId,
                name: toolCall?.function.name || 'tool_result',
                response: {
                  result: result.content,
                },
              }),
            });
          } else if (base === 'claude') {
            loopMessages.push({
              id: `tool-result-${result.toolCallId}`,
              role: 'user',
              toolCallId: result.toolCallId,
              content: result.content,
            });
          } else {
            loopMessages.push({
              id: `tool-result-${result.toolCallId}`,
              role: 'user',
              content: `[Tool result for ${result.toolCallId}]: ${result.content}`,
            });
          }
        }

        const hasOnlyBuiltins = response.toolCalls.every(toolCall => toolRegistry.isBuiltin(toolCall.function.name));
        if (hasOnlyBuiltins) {
          return {
            messages: loopMessages,
            finalText: response.fullResponse || 'Builtin tools completed.',
          };
        }
        continue;
      }

      loopMessages.push({
        id: `assistant-final-${Date.now()}-${iteration}`,
        role: 'assistant',
        content: response.fullResponse || '',
      });

      return {
        messages: loopMessages,
        finalText: response.fullResponse || '',
      };
    }

    throw new Error('tool_loop_limit_reached');
  }
}

export const toolAgentService = new ToolAgentService();
