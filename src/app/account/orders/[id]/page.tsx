'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { ORDER_DETAIL, type OrderDetailData } from '@/graphql/queries/orderDetail';
import { useParams } from 'next/navigation';

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const { data, loading, error } = useQuery<OrderDetailData>(ORDER_DETAIL, {
    variables: { token: id },
    skip: !id,
  });
  const order = data?.orderByToken || null;
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/account/orders" className="text-amber-600 hover:text-amber-700 font-medium">
          ← Back to Orders
        </Link>
        <h1 className="text-2xl font-bold mt-2">Order Details</h1>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading order...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-600">Failed to load order.</div>
      ) : !order ? (
        <div className="p-8 text-center text-gray-500">Order not found.</div>
      ) : (
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-md shadow-sm p-6 mb-8">
            <div className="flex flex-wrap justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold">#{order.number ?? order.id}</h2>
                <p className="text-gray-600">Placed on {new Date(order.created).toLocaleDateString()}</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {order.statusDisplay || order.status}
              </span>
            </div>
            
            <div className="space-y-4">
              {order.lines.map((item) => (
                <div key={item.id} className="flex items-center border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    {item.thumbnail?.url ? (
                      <Image 
                        src={item.thumbnail.url} 
                        alt={item.thumbnail.alt || item.productName} 
                        className="object-contain w-full h-full"
                        width={150}
                        height={150}
                      />
                    ) : null}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-medium">{item.productName}{item.variantName ? ` - ${item.variantName}` : ''}</h3>
                    <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-semibold">
                    {new Intl.NumberFormat(undefined, { style: 'currency', currency: item.totalPrice.gross.currency }).format(item.totalPrice.gross.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-md shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.subtotal.gross.currency }).format(order.subtotal.gross.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.shippingPrice.gross.currency }).format(order.shippingPrice.gross.amount)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.total.gross.currency }).format(order.total.gross.amount)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-md shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>
            <p className="text-gray-600 mb-4">
              {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
              {order.shippingAddress?.streetAddress1}{order.shippingAddress?.streetAddress2 ? `, ${order.shippingAddress?.streetAddress2}` : ''}<br />
              {order.shippingAddress?.city}, {order.shippingAddress?.countryArea} {order.shippingAddress?.postalCode}<br />
              {order.shippingAddress?.phone}
            </p>
            
            <h2 className="text-lg font-semibold mb-4">Billing Address</h2>
            <p className="text-gray-600">
              {order.billingAddress?.firstName} {order.billingAddress?.lastName}<br />
              {order.billingAddress?.streetAddress1}{order.billingAddress?.streetAddress2 ? `, ${order.billingAddress?.streetAddress2}` : ''}<br />
              {order.billingAddress?.city}, {order.billingAddress?.countryArea} {order.billingAddress?.postalCode}
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
