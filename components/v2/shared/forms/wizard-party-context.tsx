'use client';

import { createContext, useContext } from 'react';

/**
 * Reactive "current customer/supplier" channel exposed by V2DocumentWizard
 * to child custom sections. The wizard provides this value derived from
 * its live refSelections state so a mounted editor (e.g. LinkedInvoices)
 * can see the picked party without round-tripping through the form save.
 *
 * partyId is null when neither side has been picked, or when the current
 * doc config doesn't expose a customer/supplier header field.
 */
export type WizardPartyContextValue = {
  partyId: string | null;
};

export const WizardPartyContext = createContext<WizardPartyContextValue>({ partyId: null });

export function useWizardParty(): WizardPartyContextValue {
  return useContext(WizardPartyContext);
}
