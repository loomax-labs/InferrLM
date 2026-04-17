import { toolRegistry, type ToolSchema } from './ToolRegistry';

const TOOL_NAMES = ['plant_seed', 'water_plots', 'harvest_plots'] as const;

export type TinyGardenAction = {
  type: 'plant' | 'water' | 'harvest';
  seed?: string;
  plots: number[];
};

type TinyGardenOptions = {
  onPlant: (seed: string, plots: number[]) => string;
  onWater: (plots: number[]) => string;
  onHarvest: (plots: number[]) => string;
};

const parsePlots = (value: string): number[] => {
  return String(value || '')
    .split(/[^0-9]+/)
    .map(item => Number(item))
    .filter(item => Number.isInteger(item) && item > 0 && item <= 9);
};

const PLANT_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'plant_seed',
    description: 'Plant a seed in one or more plots.',
    parameters: {
      type: 'object',
      properties: {
        seed: {
          type: 'string',
          description: 'The seed type to plant.',
        },
        plots: {
          type: 'string',
          description: 'Comma-separated plot numbers from 1 to 9.',
        },
      },
      required: ['seed', 'plots'],
    },
  },
};

const WATER_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'water_plots',
    description: 'Water one or more plots.',
    parameters: {
      type: 'object',
      properties: {
        plots: {
          type: 'string',
          description: 'Comma-separated plot numbers from 1 to 9.',
        },
      },
      required: ['plots'],
    },
  },
};

const HARVEST_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'harvest_plots',
    description: 'Harvest one or more plots.',
    parameters: {
      type: 'object',
      properties: {
        plots: {
          type: 'string',
          description: 'Comma-separated plot numbers from 1 to 9.',
        },
      },
      required: ['plots'],
    },
  },
};

export const unregisterTinyGardenTools = () => {
  for (const name of TOOL_NAMES) {
    toolRegistry.unregister(name);
  }
};

export const registerTinyGardenTools = ({ onPlant, onWater, onHarvest }: TinyGardenOptions) => {
  unregisterTinyGardenTools();

  toolRegistry.register('plant_seed', PLANT_TOOL, async ({ seed, plots }) => {
    const plotList = parsePlots(String(plots || ''));
    if (!seed || plotList.length === 0) {
      throw new Error('invalid_plant_request');
    }
    return onPlant(String(seed), plotList);
  });

  toolRegistry.register('water_plots', WATER_TOOL, async ({ plots }) => {
    const plotList = parsePlots(String(plots || ''));
    if (plotList.length === 0) {
      throw new Error('invalid_water_request');
    }
    return onWater(plotList);
  });

  toolRegistry.register('harvest_plots', HARVEST_TOOL, async ({ plots }) => {
    const plotList = parsePlots(String(plots || ''));
    if (plotList.length === 0) {
      throw new Error('invalid_harvest_request');
    }
    return onHarvest(plotList);
  });
};
