import { createOpencodeClient } from '@opencode-ai/sdk/client';

let sdkClient = null;

export async function createSDKClient(config = {}) {
  if (sdkClient) {
    return sdkClient;
  }

  const clientConfig = {
    baseUrl: config.baseUrl || 'http://localhost:3000',
    timeout: config.timeout || 120000,
    retryCount: config.retryCount || 3,
    retryDelay: config.retryDelay || 1000,
  };

  sdkClient = createOpencodeClient(clientConfig);
  return sdkClient;
}

export async function createSession(taskId, agentType, workflowType) {
  try {
    const client = await createSDKClient();

    const sessionResult = await client.session.create({
      body: {
        metadata: {
          taskId,
          agentType,
          workflowType,
          startTime: new Date().toISOString(),
        },
      },
    });

    if (sessionResult.error) {
      throw new Error(
        `Failed to create session: ${sessionResult.error.message || 'Unknown error'}`,
      );
    }

    const sessionId = sessionResult.data.id;
    console.log(`[SDK] Session created: ${sessionId}`);

    await logAgentAction(sessionId, 'session_created', {
      taskId,
      agentType,
      workflowType,
    });

    return sessionId;
  } catch (error) {
    console.error(`[SDK] Error creating session:`, error.message);
    throw error;
  }
}

export async function closeSession(sessionId) {
  try {
    const client = await createSDKClient();

    await client.session.delete({
      path: { id: sessionId },
    });

    console.log(`[SDK] Session closed: ${sessionId}`);

    return true;
  } catch (error) {
    console.error(`[SDK] Error closing session:`, error.message);
    throw error;
  }
}

export async function invokeModel(sessionId, prompt, config = {}) {
  try {
    const client = await createSDKClient();

    const modelConfig = {
      model: config.model || 'claude-opus',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      timeout: config.timeout || 120000,
    };

    const promptResult = await client.session.prompt({
      path: { id: sessionId },
      body: {
        content: prompt,
        config: modelConfig,
      },
    });

    if (promptResult.error) {
      throw new Error(
        `Model invocation failed: ${promptResult.error.message || 'Unknown error'}`,
      );
    }

    const response = promptResult.data;

    await logAgentAction(sessionId, 'model_invocation', {
      model: modelConfig.model,
      promptLength: prompt.length,
      responseLength: response.content?.length || 0,
    });

    return {
      content: response.content,
      model: modelConfig.model,
      usage: response.usage,
    };
  } catch (error) {
    console.error(`[SDK] Error invoking model:`, error.message);
    await logAgentAction(sessionId, 'model_error', {
      error: error.message,
    });
    throw error;
  }
}

export async function streamModelResponse(sessionId, handler) {
  try {
    const client = await createSDKClient();

    const stream = await client.session.prompt({
      path: { id: sessionId },
      body: {
        stream: true,
      },
    });

    if (stream.error) {
      throw new Error(
        `Stream creation failed: ${stream.error.message || 'Unknown error'}`,
      );
    }

    const reader = stream.data.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value);
      await handler(chunk);
    }

    await logAgentAction(sessionId, 'model_stream_complete', {});

    return true;
  } catch (error) {
    console.error(`[SDK] Error streaming model response:`, error.message);
    await logAgentAction(sessionId, 'model_stream_error', {
      error: error.message,
    });
    throw error;
  }
}

export async function logAgentAction(sessionId, action, result) {
  try {
    const client = await createSDKClient();

    await client.app.log({
      body: {
        sessionId,
        action,
        result,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[SDK] Logged action: ${action}`);
  } catch (error) {
    console.error(`[SDK] Error logging action:`, error.message);
  }
}

export async function getErrorLogs(sessionId) {
  try {
    const client = await createSDKClient();

    const messagesResult = await client.session.messages({
      path: { id: sessionId },
      query: {
        filter: 'error',
      },
    });

    if (messagesResult.error) {
      console.error(
        `[SDK] Error fetching error logs: ${messagesResult.error.message}`,
      );
      return [];
    }

    return messagesResult.data.filter((msg) => msg.role === 'error');
  } catch (error) {
    console.error(`[SDK] Error getting error logs:`, error.message);
    return [];
  }
}

export async function loadConfig() {
  const defaultConfig = {
    baseUrl: 'http://localhost:3000',
    timeout: 120000,
    retryCount: 3,
    retryDelay: 1000,
    model: 'claude-opus',
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
  };

  try {
    const client = await createSDKClient();

    const configResult = await client.config.get();

    if (configResult.data) {
      return {
        ...defaultConfig,
        ...configResult.data,
      };
    }

    return defaultConfig;
  } catch (error) {
    console.error(`[SDK] Error loading config:`, error.message);
    return defaultConfig;
  }
}

export async function prompt(sessionId, content) {
  try {
    const client = await createSDKClient();

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        content,
      },
    });

    if (result.error) {
      throw new Error(
        `Prompt failed: ${result.error.message || 'Unknown error'}`,
      );
    }

    return result.data;
  } catch (error) {
    console.error(`[SDK] Error sending prompt:`, error.message);
    throw error;
  }
}

export async function endSession(sessionId) {
  return closeSession(sessionId);
}
