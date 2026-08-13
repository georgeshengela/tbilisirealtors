export type Locale = 'ka' | 'en';
export type DisplayCurrency = 'GEL' | 'USD';

export type TranslationDict = typeof import('./translations/ka').ka;
