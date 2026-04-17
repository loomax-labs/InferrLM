import { ChatMessage } from '../utils/ChatManager';
import { engineService } from './inference-engine-service';
import { onlineModelService, OnlineModelService } from './OnlineModelService';
import chatManager from '../utils/ChatManager';
import { generateRandomId } from '../utils/homeScreenUtils';
import { appleFoundationService } from './AppleFoundationService';
import type { ProviderType } from './ModelManagementService';
import { RAGService } from './rag/RAGService';
import type { Message as RAGMessage } from 'react-native-rag';
import { toolRegistry } from './tools/ToolRegistry';
import { toolExecutor } from './tools/ToolExecutor';
import type { ToolCall } from './tools/ToolRegistry';
import { ThinkTagParser } from '../utils/thinkTagParser';

export interface MessageProcessingCallbacks {
  setMessages: (messages: ChatMessage[]) => void;
  setStreamingMessageId: (id: string | null) => void;
  setStreamingMessage: (message: string) => void;
  setStreamingThinking: (thinking: string) => void;
  setStreamingStats: (stats: { tokens: number; duration: number; firstTokenTime?: number; avgTokenTime?: number } | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsRegenerating: (regenerating: boolean) => void;
  saveMessagesImmediate: (messages: ChatMessage[]) => Promise<void>;
  saveMessages: (messages: ChatMessage[]) => void;
  saveMessagesDebounced: { cancel: () => void };
  updateMessageContentDebounced: (messageId: string, content: string, thinking: string, stats: any) => void;
  handleApiError: (error: unknown, provider: 'Gemini' | 'OpenAI' | 'Claude') => void;
}

export class MessageProcessingService {
  private cancelGenerationRef: React.MutableRefObject<boolean>;
  private callbacks: MessageProcessingCallbacks;

  constructor(cancelGenerationRef: React.MutableRefObject<boolean>, callbacks: MessageProcessingCallbacks) {
    this.cancelGenerationRef = cancelGenerationRef;
    this.callbacks = callbacks;
  }

  async processMessage(
    activeProvider: ProviderType | null,
    settings: any
  ): Promise<void> {
    const currentChat = chatManager.getCurrentChat();
    if (!currentChat) return;

    console.log('process_message_start', { provider: activeProvider, chatId: currentChat.id, messageCount: currentChat.messages.length });

    try {
      this.callbacks.setIsRegenerating(true);
      
      const currentMessages = currentChat.messages;
      const isOnlineModel = !!activeProvider && ['gemini','chatgpt','claude'].includes(OnlineModelService.getBaseProvider(activeProvider));
      const isAppleFoundation = activeProvider === 'apple-foundation';

      const fallbackSystemPrompt = settings.systemPrompt || '';
      let systemPrompt = fallbackSystemPrompt;
      if (isOnlineModel && activeProvider) {
        const providerSystemInstruction = await onlineModelService.getSystemInstruction(activeProvider);
        if (providerSystemInstruction && providerSystemInstruction.trim()) {
          systemPrompt = providerSystemInstruction.trim();
        }
      }

      const processedMessages = isOnlineModel
        ? [{ role: 'system', content: systemPrompt, id: 'system-prompt' }, ...currentMessages.filter(msg => msg.role !== 'system')]
        : currentMessages.some(msg => msg.role === 'system')
          ? currentMessages
          : systemPrompt
            ? [{ role: 'system', content: systemPrompt, id: 'system-prompt' }, ...currentMessages]
            : currentMessages;
      const skipRag = this.shouldSkipRag(processedMessages) || await this.shouldSkipRagForInput(processedMessages);
      const responderModelName = await this.resolveResponderModelName(activeProvider);
      if (responderModelName) {
        console.log('resp_model', responderModelName);
      }
      
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        role: 'assistant',
        content: '',
        modelName: responderModelName,
        stats: {
          duration: 0,
          tokens: 0,
        }
      };
      
      await chatManager.addMessage(assistantMessage);
      const updatedChat = chatManager.getCurrentChat();
      if (!updatedChat) return;

      this.callbacks.setMessages([...updatedChat.messages]);

      const lastMessage = updatedChat.messages.slice(-1)[0];
      if (!lastMessage) return;
      
      const messageId = lastMessage.id;
      
      this.callbacks.setStreamingMessageId(messageId);
      this.callbacks.setStreamingMessage('');
      this.callbacks.setStreamingThinking('');
      this.callbacks.setStreamingStats({ tokens: 0, duration: 0 });
      this.callbacks.setIsStreaming(true);
      
      const startTime = Date.now();
      let tokenCount = 0;
      let fullResponse = '';
      let thinking = '';
      let isThinking = false;
      let firstTokenTime: number | null = null;
      this.cancelGenerationRef.current = false;
      
      let updateCounter = 0;

      if (isOnlineModel) {
        await this.processOnlineModel(
          activeProvider,
          processedMessages,
          settings,
          messageId,
          startTime,
          tokenCount,
          fullResponse,
          firstTokenTime,
          updateCounter
        );
      } else if (isAppleFoundation) {
        await this.processAppleFoundationModel(
          processedMessages,
          settings,
          messageId,
          startTime,
          skipRag
        );
      } else {
        await this.processLocalModel(
          processedMessages,
          settings,
          messageId,
          startTime,
          tokenCount,
          fullResponse,
          thinking,
          isThinking,
          firstTokenTime,
          updateCounter,
          skipRag
        );
      }
      
      if (!this.cancelGenerationRef.current) {
        this.callbacks.setIsStreaming(false);
        this.callbacks.setStreamingMessageId(null);
        this.callbacks.setStreamingThinking('');
        this.callbacks.setStreamingStats(null);
        this.callbacks.setIsRegenerating(false);
      }
      
    } catch (error) {
      if (!this.cancelGenerationRef.current) {
        this.callbacks.setIsStreaming(false);
        this.callbacks.setStreamingMessageId(null);
        this.callbacks.setStreamingThinking('');
        this.callbacks.setStreamingStats(null);
        this.callbacks.setIsRegenerating(false);
      }
      throw error;
    }
  }

  private async processOnlineModel(
    activeProvider: string,
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    tokenCount: number,
    fullResponse: string,
    firstTokenTime: number | null,
    updateCounter: number
  ): Promise<void> {
    const thinkParser = new ThinkTagParser();
    let thinking = '';
    let isThinking = false;

    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }

      const chunks = thinkParser.feed(token);

      for (const chunk of chunks) {
        if (chunk.type === 'open') {
          isThinking = true;
          continue;
        }
        if (chunk.type === 'close') {
          isThinking = false;
          continue;
        }

        if (isThinking) {
          thinking += chunk.text;
          this.callbacks.setStreamingThinking(thinking.trim());
          if (settings.includeThinkingTokens) {
            const t = Date.now();
            if (firstTokenTime === null && chunk.text.trim().length > 0) {
              firstTokenTime = t - startTime;
            }
            tokenCount++;
          }
          continue;
        }

        const currentTime = Date.now();

        if (firstTokenTime === null && chunk.text.trim().length > 0) {
          firstTokenTime = currentTime - startTime;
        }

        tokenCount++;
        fullResponse += chunk.text;
      }

      const nowTime = Date.now();
      const duration = (nowTime - startTime) / 1000;
      let avgTokenTime = undefined;

      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = nowTime - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }

      this.callbacks.setStreamingMessage(fullResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });

      updateCounter++;
      if (updateCounter % 10 === 0 ||
          fullResponse.endsWith('.') ||
          fullResponse.endsWith('!') ||
          fullResponse.endsWith('?')) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }

        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          thinking.trim(),
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }

      return !this.cancelGenerationRef.current;
    };

    const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = `${instruction}\n\nUser request: ${userPrompt}`;
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.openaiFileId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `[File: ${fileName} (id: ${parsed.metadata.openaiFileId})]\n\n${userContent}`;
          } else if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else if (parsed.metadata?.remoteFileUri) {
            content = msg.content;
          } else {
            content = parsed.internalInstruction || msg.content;
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];

    const legacyStreamCallback = (partialResponse: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }
      
      const currentTime = Date.now();
      
      if (firstTokenTime === null && partialResponse.trim().length > 0) {
        firstTokenTime = currentTime - startTime;
      }
      
      const wordCount = partialResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
      tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));
      fullResponse = partialResponse;
      
      const duration = (currentTime - startTime) / 1000;
      let avgTokenTime = undefined;
      
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = currentTime - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      this.callbacks.setStreamingMessage(partialResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });
      
      updateCounter++;
      if (updateCounter % 10 === 0 || 
          partialResponse.endsWith('.') || 
          partialResponse.endsWith('!') || 
          partialResponse.endsWith('?')) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }
        
        this.callbacks.updateMessageContentDebounced(
          messageId,
          partialResponse,
          '',
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }
      
      return !this.cancelGenerationRef.current;
    };

    const messageParams = [...baseMessages]
      .filter(msg => msg.content.trim() !== '')
      .map(msg => ({ 
        id: generateRandomId(), 
        role: msg.role as 'system' | 'user' | 'assistant', 
        content: msg.content 
      }));

    const apiParams = {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      stream: true,
      streamTokens: true
    };

    const isGemini = OnlineModelService.getBaseProvider(activeProvider) === 'gemini';
    const isOpenAI = OnlineModelService.getBaseProvider(activeProvider) === 'chatgpt';
    const isClaude = OnlineModelService.getBaseProvider(activeProvider) === 'claude';
    console.log('msgproc_provider', { activeProvider, isGemini, isOpenAI, isClaude });

    /*
      Image generation: detect explicit image generation requests for OpenAI.
      If the last user message starts with /image, route to image generation.
    */
    if (isOpenAI) {
      const lastUserMsg = baseMessages.filter(m => m.role === 'user').pop();
      if (lastUserMsg && typeof lastUserMsg.content === 'string' && lastUserMsg.content.startsWith('/image ')) {
        const prompt = lastUserMsg.content.slice(7).trim();
        if (prompt.length > 0) {
          try {
            this.callbacks.setStreamingMessage('Generating image...');
            const imageResult = await onlineModelService.generateImage(prompt, {}, activeProvider);
            const imageMsg = JSON.stringify({
              type: 'image_generation',
              prompt,
              revisedPrompt: imageResult.revisedPrompt,
              localUri: imageResult.localUri,
              url: imageResult.url,
            });
            fullResponse = imageMsg;
            await chatManager.updateMessageContent(
              messageId,
              imageMsg,
              '',
              { duration: (Date.now() - startTime) / 1000, tokens: 0 }
            );
            return;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Image generation failed';
            fullResponse = errMsg;
            await chatManager.updateMessageContent(messageId, errMsg, '', { duration: 0, tokens: 0 });
            return;
          }
        }
      }
    }

    try {
      /*
        Tool call loop for OpenAI: if tools are registered, send with tools
        and handle the tool call response loop (max 5 iterations).
      */
      if (isGemini && toolRegistry.hasTools()) {
        console.log('msgproc_gemini_tools_start', { toolCount: toolRegistry.getAllTools().length });
        let iteration = 0;
        let loopMessages: any[] = [...messageParams];
        const tools = toolRegistry.getAllTools();

        while (!toolExecutor.hasReachedLimit(iteration)) {
          if (this.cancelGenerationRef.current) break;
          iteration++;
          console.log('msgproc_gemini_iter', { iteration, msgCount: loopMessages.length });

          const response = await onlineModelService.sendGeminiWithTools(
            loopMessages,
            tools,
            apiParams,
            undefined,
            activeProvider
          );

          if (response.toolCalls && response.toolCalls.length > 0) {
            this.callbacks.setStreamingMessage('Using tools...');
            console.log('msgproc_gemini_tool_calls', {
              count: response.toolCalls.length,
              rawParts: response.rawParts ? response.rawParts.length : 0,
            });

            loopMessages.push({
              id: generateRandomId(),
              role: 'assistant' as const,
              content: JSON.stringify({ type: 'gemini_tool_use_response', rawParts: response.rawParts || [] }),
            });

            const results = await toolExecutor.executeAll(response.toolCalls);
            console.log('msgproc_gemini_tool_results', { count: results.length });

            const toolMap = new Map<string, ToolCall>();
            for (const tc of response.toolCalls) {
              toolMap.set(tc.id, tc);
            }

            for (const result of results) {
              const toolCall = toolMap.get(result.toolCallId);
              loopMessages.push({
                id: generateRandomId(),
                role: 'user' as const,
                toolCallId: result.toolCallId,
                content: JSON.stringify({
                  type: 'function_response',
                  id: result.toolCallId,
                  name: toolCall?.function.name || 'tool_result',
                  response: { result: result.content },
                }),
              });
            }

            const hasOnlyBuiltins = response.toolCalls.every(
              (tc: ToolCall) => toolRegistry.isBuiltin(tc.function.name)
            );
            if (hasOnlyBuiltins) {
              console.log('msgproc_gemini_builtin_only');
              break;
            }
            continue;
          }

          fullResponse = response.fullResponse;
          tokenCount = response.tokenCount;
          console.log('msgproc_gemini_done', { tokenCount, textLen: fullResponse.length });
          legacyStreamCallback(fullResponse);
          break;
        }
      } else if (isOpenAI && toolRegistry.hasTools()) {
        console.log('msgproc_openai_tools_start', { toolCount: toolRegistry.getAllTools().length });
        let iteration = 0;
        let loopMessages = [...messageParams];
        const tools = toolRegistry.getAllTools();

        while (!toolExecutor.hasReachedLimit(iteration)) {
          if (this.cancelGenerationRef.current) break;
          iteration++;
          console.log('msgproc_openai_iter', { iteration, msgCount: loopMessages.length });

          const response = await onlineModelService.sendOpenAIWithTools(
            loopMessages,
            tools,
            apiParams,
            undefined,
            activeProvider
          );

          if (response.toolCalls && response.toolCalls.length > 0) {
            this.callbacks.setStreamingMessage('Using tools...');
            console.log('msgproc_openai_tool_calls', { count: response.toolCalls.length });

            loopMessages.push({
              id: generateRandomId(),
              role: 'assistant' as const,
              content: response.fullResponse || '',
            });

            const results = await toolExecutor.executeAll(response.toolCalls);
            console.log('msgproc_openai_tool_results', { count: results.length });
            for (const result of results) {
              loopMessages.push({
                id: generateRandomId(),
                role: 'user' as const,
                content: `[Tool result for ${result.toolCallId}]: ${result.content}`,
              });
            }

            const hasOnlyBuiltins = response.toolCalls.every(
              tc => toolRegistry.isBuiltin(tc.function.name)
            );
            if (hasOnlyBuiltins) {
              console.log('msgproc_openai_builtin_only');
              break;
            }
            continue;
          }

          fullResponse = response.fullResponse;
          tokenCount = response.tokenCount;
          console.log('msgproc_openai_done', { tokenCount, textLen: fullResponse.length });
          legacyStreamCallback(fullResponse);
          break;
        }
      } else if (isClaude && toolRegistry.hasTools()) {
        console.log('msgproc_claude_tools_start', { toolCount: toolRegistry.getAllTools().length });
        let iteration = 0;
        let loopMessages: any[] = [...messageParams];
        const tools = toolRegistry.getAllTools();

        while (!toolExecutor.hasReachedLimit(iteration)) {
          if (this.cancelGenerationRef.current) break;
          iteration++;
          console.log('msgproc_claude_iter', { iteration, msgCount: loopMessages.length });

          const response = await onlineModelService.sendClaudeWithTools(
            loopMessages,
            tools,
            apiParams,
            undefined,
            activeProvider
          );

          if (response.toolCalls && response.toolCalls.length > 0) {
            this.callbacks.setStreamingMessage('Using tools...');
            console.log('msgproc_claude_tool_calls', {
              count: response.toolCalls.length,
              rawBlocks: response.rawContent ? response.rawContent.length : 0,
            });

            loopMessages.push({
              id: generateRandomId(),
              role: 'assistant' as const,
              content: JSON.stringify({ type: 'tool_use_response', rawContent: response.rawContent }),
            });
            console.log('msgproc_claude_push_assistant', { msgCount: loopMessages.length });

            const results = await toolExecutor.executeAll(response.toolCalls);
            console.log('msgproc_claude_tool_results', { count: results.length });
            for (const result of results) {
              loopMessages.push({
                id: generateRandomId(),
                role: 'user' as const,
                content: result.content,
                toolCallId: result.toolCallId,
              });
            }
            console.log('msgproc_claude_push_results', { msgCount: loopMessages.length });

            const hasOnlyBuiltins = response.toolCalls.every(
              tc => toolRegistry.isBuiltin(tc.function.name)
            );
            if (hasOnlyBuiltins) {
              console.log('msgproc_claude_builtin_only');
              break;
            }
            continue;
          }

          fullResponse = response.fullResponse;
          tokenCount = response.tokenCount;
          console.log('msgproc_claude_done', { tokenCount, textLen: fullResponse.length });
          legacyStreamCallback(fullResponse);
          break;
        }
      } else {
        console.log('msgproc_send_plain', { provider: activeProvider, msgCount: messageParams.length });
        await onlineModelService.sendMessage(activeProvider, messageParams, apiParams, legacyStreamCallback);
      }
    } catch (error) {
      console.log('online_model_error', error instanceof Error ? error.message : 'unknown');
      console.log('online_model_error_stack', error instanceof Error ? error.stack : '');
      if (this.callbacks.handleApiError) {
        this.callbacks.handleApiError(error, this.getProviderDisplayName(activeProvider));
      }
      
      await chatManager.updateMessageContent(
        messageId,
        'Sorry, an error occurred while generating a response. Please try again.',
        '',
        { duration: 0, tokens: 0 }
      );
      return;
    }
    
    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        thinking.trim(),
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined
        }
      );
    }
  }

  private async processAppleFoundationModel(
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    skipRag: boolean
  ): Promise<void> {
    let fullResponse = '';
    let tokenCount = 0;
    let firstTokenTime: number | null = null;
    let updateCounter = 0;

    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        return false;
      }

      if (firstTokenTime === null && token.trim().length > 0) {
        firstTokenTime = Date.now() - startTime;
      }

      fullResponse += token;
      const wordCount = fullResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
      tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));

      const duration = (Date.now() - startTime) / 1000;
      let avgTokenTime = undefined;

      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }

      this.callbacks.setStreamingMessage(fullResponse);
      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined,
      });

      updateCounter++;
      if (
        updateCounter % 10 === 0 ||
        fullResponse.endsWith('.') ||
        fullResponse.endsWith('!') ||
        fullResponse.endsWith('?')
      ) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }

        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          '',
          {
            duration,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined,
          }
        );
      }

      return !this.cancelGenerationRef.current;
    };

    const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = instruction + (userPrompt ? `\n\n${userPrompt}` : '');
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userContent = parsed.userContent || '';
            content = instruction + (userContent ? `\n\n${userContent}` : '');
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];

    let usedRAG = false;
    const chatId = chatManager.getCurrentChatId();

    if (!skipRag) {
      try {
        const ragEnabled = await RAGService.isEnabled();
        if (ragEnabled) {
          if (!RAGService.isReady()) {
            await RAGService.initialize('apple-foundation');
          }
          if (RAGService.isReady()) {
            await RAGService.generate({
              input: baseMessages,
              settings,
              callback: streamCallback,
              scope: {
                chatId,
                provider: 'apple-foundation',
              },
            });
            usedRAG = true;
          }
        }
      } catch (error) {
        console.log('apple_rag_error', error instanceof Error ? error.message : 'unknown');
        usedRAG = false;
      }
    }

    if (!usedRAG) {
      try {
        const stream = appleFoundationService.streamResponse(
          baseMessages.map(msg => ({ role: msg.role, content: msg.content })),
          {
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topP: settings.topP,
            topK: settings.topK,
          }
        );

        for await (const chunk of stream) {
          if (this.cancelGenerationRef.current) {
            appleFoundationService.cancel();
            break;
          }

          if (firstTokenTime === null && chunk.trim().length > 0) {
            firstTokenTime = Date.now() - startTime;
          }

          fullResponse += chunk;
          const wordCount = fullResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
          tokenCount = Math.max(1, Math.ceil(wordCount * 1.33));

          const duration = (Date.now() - startTime) / 1000;
          let avgTokenTime = undefined;

          if (firstTokenTime !== null && tokenCount > 0) {
            const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
            avgTokenTime = timeAfterFirstToken / tokenCount;
          }

          this.callbacks.setStreamingMessage(fullResponse);
          this.callbacks.setStreamingStats({
            tokens: tokenCount,
            duration,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined,
          });

          updateCounter++;
          if (
            updateCounter % 10 === 0 ||
            fullResponse.endsWith('.') ||
            fullResponse.endsWith('!') ||
            fullResponse.endsWith('?')
          ) {
            let debouncedAvgTokenTime = undefined;
            if (firstTokenTime !== null && tokenCount > 0) {
              const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
              debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
            }

            this.callbacks.updateMessageContentDebounced(
              messageId,
              fullResponse,
              '',
              {
                duration,
                tokens: tokenCount,
                firstTokenTime: firstTokenTime || undefined,
                avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined,
              }
            );
          }
        }
      } catch (error) {
        appleFoundationService.cancel();
        const message = error instanceof Error ? error.message : String(error);
        console.log('apple_intelligence_error', message);
        const normalized = message.toLowerCase();
        let displayMessage = 'Apple Intelligence not available on this device.';
        if (normalized.includes('disabled')) {
          displayMessage = 'Apple Intelligence is disabled. Enable it in Settings to continue.';
        } else if (normalized.includes('locale') || normalized.includes('language')) {
          displayMessage = 'Apple Intelligence language/locale not supported. Try using English locale.';
        } else if (!normalized.includes('not available')) {
          displayMessage = 'Apple Intelligence encountered an error. Please try again.';
        }
        await chatManager.updateMessageContent(
          messageId,
          displayMessage,
          '',
          { duration: 0, tokens: 0 }
        );
        return;
      }
    }

    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }

      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        '',
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined,
        }
      );
    }
  }

  private async processLocalModel(
    processedMessages: any[],
    settings: any,
    messageId: string,
    startTime: number,
    _tokenCount: number,
    _fullResponse: string,
    _thinking: string,
    _isThinking: boolean,
    _firstTokenTime: number | null,
    _updateCounter: number,
    skipRag: boolean
  ): Promise<void> {
    let tokenCount = 0;
    let fullResponse = '';
    let thinking = '';
    let isThinking = false;
    let firstTokenTime: number | null = null;
    let updateCounter = 0;

    console.log('local_model_start', { messageId, skipRag, msgCount: processedMessages.length });
    console.log('local_model_settings', { systemPrompt: settings.systemPrompt, temperature: settings.temperature, maxTokens: settings.maxTokens });

    const thinkParser = new ThinkTagParser();

    const streamCallback = (token: string) => {
      if (this.cancelGenerationRef.current) {
        console.log('local_stream_cancelled');
        return false;
      }

      const chunks = thinkParser.feed(token);

      for (const chunk of chunks) {
        if (chunk.type === 'open') {
          isThinking = true;
          console.log('local_thinking_start');
          continue;
        }
        if (chunk.type === 'close') {
          isThinking = false;
          console.log('local_thinking_end', { thinkingLength: thinking.length });
          continue;
        }

        if (tokenCount <= 5 || tokenCount % 50 === 0) {
          console.log(`local_token[${tokenCount}]`, JSON.stringify(chunk.text), { isThinking });
        }

        if (firstTokenTime === null && (!isThinking || settings.includeThinkingTokens) && chunk.text.trim().length > 0) {
          firstTokenTime = Date.now() - startTime;
        }

        if (isThinking) {
          thinking += chunk.text;
          this.callbacks.setStreamingThinking(thinking.trim());
          if (settings.includeThinkingTokens) {
            tokenCount++;
          }
        } else {
          tokenCount++;
          fullResponse += chunk.text;
          this.callbacks.setStreamingMessage(fullResponse);
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      let avgTokenTime = undefined;

      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        avgTokenTime = timeAfterFirstToken / tokenCount;
      }

      this.callbacks.setStreamingStats({
        tokens: tokenCount,
        duration: duration,
        firstTokenTime: firstTokenTime || undefined,
        avgTokenTime: avgTokenTime && avgTokenTime > 0 ? avgTokenTime : undefined
      });

      updateCounter++;
      if (updateCounter % 20 === 0) {
        let debouncedAvgTokenTime = undefined;
        if (firstTokenTime !== null && tokenCount > 0) {
          const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
          debouncedAvgTokenTime = timeAfterFirstToken / tokenCount;
        }

        this.callbacks.updateMessageContentDebounced(
          messageId,
          fullResponse,
          thinking.trim(),
          {
            duration: (Date.now() - startTime) / 1000,
            tokens: tokenCount,
            firstTokenTime: firstTokenTime || undefined,
            avgTokenTime: debouncedAvgTokenTime && debouncedAvgTokenTime > 0 ? debouncedAvgTokenTime : undefined
          }
        );
      }

      return !this.cancelGenerationRef.current;
    };

  const baseMessages = processedMessages.map(msg => {
      let content = msg.content;
      
      try {
        const parsed = JSON.parse(msg.content);
        
        if (parsed && parsed.type === 'ocr_result') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName ? ` from ${parsed.fileName}` : '';
            const userPrompt = parsed.userPrompt || 'Please process this extracted text';
            content = `User uploaded an image${fileName} and extracted text from it. The text has been stored for retrieval.\n\nUser request: ${userPrompt}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userPrompt = parsed.userPrompt || '';
            content = instruction + (userPrompt ? `\n\n${userPrompt}` : '');
          }
        } else if (parsed && parsed.type === 'file_upload') {
          if (parsed.metadata?.ragDocumentId) {
            const fileName = parsed.fileName || 'a file';
            const userContent = parsed.userContent || `File uploaded: ${fileName}`;
            content = `User uploaded ${fileName}. The content has been stored for retrieval.\n\nUser request: ${userContent}`;
          } else {
            const instruction = parsed.internalInstruction || '';
            const userContent = parsed.userContent || '';
            content = instruction + (userContent ? `\n\n${userContent}` : '');
          }
        }
      } catch {
      }
      
      return { role: msg.role, content };
    }) as RAGMessage[];

    console.log('local_base_messages_dump:');
    baseMessages.forEach((msg, i) => {
      console.log(`  base[${i}:${msg.role}] ${msg.content}`);
    });

    let usedRAG = false;
    const chatId = chatManager.getCurrentChatId();

    if (!skipRag) {
      try {
        const ragEnabled = await RAGService.isEnabled();
        if (ragEnabled && engineService.mgr().ready()) {
          if (!RAGService.isReady()) {
            await RAGService.initialize('local');
          }
          if (RAGService.isReady()) {
            await RAGService.generate({
              input: baseMessages,
              settings,
              callback: streamCallback,
              scope: {
                chatId,
                provider: 'local',
              },
            });
            usedRAG = true;
          }
        }
      } catch {
        usedRAG = false;
      }
    }

    if (!usedRAG) {
      console.log('local_gen_direct', { baseMessageCount: baseMessages.length });
      await engineService.mgr().gen(
        baseMessages as any,
        {
          onToken: streamCallback,
          settings
        }
      );
    }

    console.log('local_model_done', { tokenCount, responseLength: fullResponse.length, thinkingLength: thinking.length, cancelled: this.cancelGenerationRef.current });
    console.log('local_response:', fullResponse);
    if (thinking) {
      console.log('local_thinking:', thinking);
    }

    if (!this.cancelGenerationRef.current) {
      let finalAvgTokenTime = undefined;
      if (firstTokenTime !== null && tokenCount > 0) {
        const timeAfterFirstToken = Date.now() - (startTime + firstTokenTime);
        finalAvgTokenTime = timeAfterFirstToken / tokenCount;
      }
      
      await chatManager.updateMessageContent(
        messageId,
        fullResponse,
        thinking.trim(),
        {
          duration: (Date.now() - startTime) / 1000,
          tokens: tokenCount,
          firstTokenTime: firstTokenTime || undefined,
          avgTokenTime: finalAvgTokenTime && finalAvgTokenTime > 0 ? finalAvgTokenTime : undefined
        }
      );
    }
  }

  private getProviderDisplayName(provider: string): 'Gemini' | 'OpenAI' | 'Claude' {
    const base = OnlineModelService.getBaseProvider(provider);
    switch (base) {
      case 'gemini': return 'Gemini';
      case 'chatgpt': return 'OpenAI';
      case 'claude': return 'Claude';
      default: return 'OpenAI';
    }
  }

  private async resolveResponderModelName(activeProvider: ProviderType | null): Promise<string | undefined> {
    if (!activeProvider || activeProvider === 'local') {
      const activePath = engineService.getActiveModelPath();
      if (!activePath) {
        return undefined;
      }
      return this.getLocalModelName(activePath);
    }

    if (activeProvider === 'apple-foundation') {
      return 'Apple Foundation';
    }

    const configured = await onlineModelService.getModelName(activeProvider);
    if (configured && configured.trim()) {
      return configured.trim();
    }

    const fallback = onlineModelService.getDefaultModelName(activeProvider);
    if (fallback && fallback.trim()) {
      return fallback.trim();
    }

    const base = OnlineModelService.getBaseProvider(activeProvider);
    return base || undefined;
  }

  private getLocalModelName(path: string): string {
    const file = path.split('/').pop() || path;
    return file.replace(/\.(gguf|mlx|litertlm|task)$/i, '');
  }

  private shouldSkipRag(messages: Array<{ role: string; content: string }>): boolean {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const entry = messages[index];
      if (entry.role !== 'user') {
        continue;
      }
      try {
        const parsed = JSON.parse(entry.content);
        if (parsed?.type === 'multimodal') {
          return true;
        }
        return parsed?.metadata?.ragDisabled === true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async shouldSkipRagForInput(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    let lastUserText = '';
    let isFileMessage = false;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const entry = messages[index];
      if (entry.role !== 'user') {
        continue;
      }

      try {
        const parsed = JSON.parse(entry.content);
        if (parsed?.type === 'ocr_result') {
          lastUserText = String(parsed?.userPrompt || '').trim();
          isFileMessage = true;
        } else if (parsed?.type === 'file_upload') {
          lastUserText = String(parsed?.userContent || '').trim();
          isFileMessage = true;
        } else {
          lastUserText = String(entry.content || '').trim();
        }
      } catch {
        lastUserText = String(entry.content || '').trim();
      }
      break;
    }

    const compactText = lastUserText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const tokenCount = compactText.length > 0 ? compactText.split(/\s+/).length : 0;

    if (!isFileMessage && (compactText.length <= 4 || tokenCount <= 1)) {
      return true;
    }

    if (!isFileMessage && /^(hi|hey|hello|yo|sup|hola|hii+)$/.test(compactText)) {
      return true;
    }

    try {
      const status = await RAGService.getStatus();
      if (!status.enabled || status.documentCount <= 0) {
        return true;
      }
    } catch {
      return true;
    }

    return false;
  }
}
