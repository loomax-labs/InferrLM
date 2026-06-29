import { toolRegistry } from '../tools/ToolRegistry';

export type LitertToolDef = {
  name: string;
  description: string;
  parametersJson: string;
};

export const toLitertTools = (): LitertToolDef[] => {
  return toolRegistry.getAllTools().map(tool => ({
    name: tool.function.name,
    description: tool.function.description || '',
    parametersJson: JSON.stringify(tool.function.parameters || { type: 'object', properties: {} }),
  }));
};
