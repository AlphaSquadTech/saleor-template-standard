import { Metadata } from 'next';
import { getStoreName } from '@/app/utils/branding';

export const metadata: Metadata = {
  title: `My Payment Methods - ${getStoreName()}`,
  description:
    'Manage your saved payment methods. Add, view, and remove cards for faster checkout.',
};

export default function PaymentMethodsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
