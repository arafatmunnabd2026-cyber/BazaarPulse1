import React from 'react';

export interface PluginDefinition {
  key: string;
  name: string;
  description: string;
  category: 'Marketing' | 'Navigation' | 'Storefront' | 'AI & Tools';
  defaultEnabled: boolean;
  version: string;
  author: string;
}

export const AVAILABLE_PLUGINS: PluginDefinition[] = [];
