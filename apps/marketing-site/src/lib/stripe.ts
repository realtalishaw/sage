// Placeholder for stripe functionality
export const initStripe = () => {
  // TODO: Implement stripe
};

interface CheckoutLinkParams {
  applicationId?: string;
  userEmail: string | null;
  userId: string | null;
}

export function buildSageAnnualCheckoutLink(_params: CheckoutLinkParams): string {
  // TODO: Implement Stripe checkout link generation
  console.warn('buildSageAnnualCheckoutLink is not yet implemented');
  return '#';
}
