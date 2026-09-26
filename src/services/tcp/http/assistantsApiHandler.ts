import assistantService from '../../AssistantService';
import { logger } from '../../../utils/logger';
import type { ApiHandler, JsonResponder } from './apiTypes';

type Context = {
  respond: JsonResponder;
};

export function createAssistantsApiHandler(context: Context): ApiHandler {
  return async (method, segments, _body, socket, path) => {
    if (segments.length > 0) {
      return false;
    }

    if (method !== 'GET') {
      context.respond(socket, 405, { error: 'method_not_allowed' });
      logger.logWebRequest(method, path, 405);
      return true;
    }

    try {
      const assistants = await assistantService.listLocalForApi();
      context.respond(socket, 200, { assistants });
      logger.logWebRequest(method, path, 200);
    } catch {
      context.respond(socket, 500, { error: 'assistants_list_failed' });
      logger.logWebRequest(method, path, 500);
    }

    return true;
  };
}
