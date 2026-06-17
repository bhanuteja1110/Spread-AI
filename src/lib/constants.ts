/**
 * Global application constants
 */

export const APP_CONFIG = {
  name: 'Spread AI',
  description: 'Production grade AI platform',
  supportEmail: 'support@spreadai.com',
} as const;

export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  settings: '/settings',
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;
