import type { GiftParty } from '@/lib/gift-portal';
// Deliberately public credentials for isolated, disposable showcase accounts only.
export const GIFT_DEMO_PASSWORD = 'CorpVidesh-Demo-2026!';
export const GIFT_DEMO_ACCOUNTS: { party: GiftParty; email: string; action: string }[] = [
  { party: 'treasury', email: 'showcase.treasury@corpvideshai.com', action: 'Open a case and file the demonstration pack.' },
  { party: 'ad_bank', email: 'showcase.adbank@corpvideshai.com', action: 'Verify & forward, or raise a query.' },
  { party: 'rbi', email: 'showcase.rbi@corpvideshai.com', action: 'Record the RBI demonstration review.' },
  { party: 'ifsca', email: 'showcase.ifsca@corpvideshai.com', action: 'Record the IFSCA demonstration review.' },
  { party: 'mof', email: 'showcase.mof@corpvideshai.com', action: 'Record the proposed policy review.' },
  { party: 'fiu_ind', email: 'showcase.fiuind@corpvideshai.com', action: 'Record the financial-intelligence demonstration review.' },
  { party: 'dpiit', email: 'showcase.dpiit@corpvideshai.com', action: 'Record the proposed sector review.' },
  { party: 'cbdt', email: 'showcase.cbdt@corpvideshai.com', action: 'Record the proposed tax review.' },
  { party: 'ibu', email: 'showcase.ibu@corpvideshai.com', action: 'Record a simulated release after all six reviews.' },
];