'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_MY_PROFILE, type GetMyProfileData } from '@/graphql/queries/getMyProfile';
import Breadcrumb from '../components/reuseableUI/breadcrumb';
const breadcrumbItems = [
  { text: 'HOME', link: '/' },
  { text: 'MY ACCOUNT' },
];
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useQuery<GetMyProfileData>(GET_MY_PROFILE, {
    fetchPolicy: 'no-cache',
  });

  const navigationItems = [
    {
      name: 'My Profile',
      href: '/account/settings',
    },
    {
      name: 'Order History',
      href: '/account/orders',
    },
    {
      name: 'Address Book',
      href: '/account/address',
    },
  ];


  return (
    <div className="max-w-7xl mx-auto py-12 px-4 md:px-6 md:py-16 lg:py-24  space-y-8 lg:space-y-16">
      <div className='space-y-5'>
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-normal font-primary text-[var(--color-secondary-800)]">MY ACCOUNT</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-16">
        <div className="lg:col-span-1 flex lg:flex-col border-r border-[var(--color-secondary-200)] gap-4 md:gap-6 lg:gap-5">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`uppercase block font-medium text-sm md:text-lg lg:text-xl font-secondary ${pathname === item.href ? 'text-[var(--color-secondary-800)]' : 'text-[var(--color-secondary-400)] hover:bg-gray-50'}`}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
}
