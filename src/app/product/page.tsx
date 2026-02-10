'use client';

import { ProductCard } from "@/app/components/reuseableUI/productCard";
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { ProductSkeleton } from "@/app/components/reuseableUI/productSkeleton";
import { generateItemListSchema } from "@/lib/schema";

const products = [
  {
    id: '1',
    name: 'Premium Carbon Fiber Intake',
    price: 899.99,
    originalPrice: 1199.99,
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=400&fit=crop&auto=format',
    category: 'Engine',
    rating: 4.9,
    reviews: 156,
    inStock: true,
    featured: true,
    href: '/product/1',
    compatibility: [
      { year: '2023', make: 'Toyota', model: 'Camry' },
      { year: '2022', make: 'Honda', model: 'Accord' },
      { year: '2021', make: 'Ford', model: 'F-150' },
    ],
  },
  {
    id: '2',
    name: 'Luxury Brake Caliper Set',
    price: 1299.99,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format',
    category: 'Brakes',
    rating: 4.8,
    reviews: 203,
    inStock: true,
    featured: false,
    href: '/product/2',
    compatibility: [
      { year: '2023', make: 'BMW', model: 'X5' },
      { year: '2022', make: 'Mercedes', model: 'C-Class' },
      { year: '2021', make: 'Audi', model: 'A4' },
    ],
  },
  {
    id: '3',
    name: 'Elite LED Headlight System',
    price: 749.99,
    originalPrice: 899.99,
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&h=400&fit=crop&auto=format',
    category: 'Lighting',
    rating: 4.9,
    reviews: 89,
    inStock: true,
    featured: true,
    href: '/product/3',
    compatibility: [
      { year: '2023', make: 'Toyota', model: 'Camry' },
      { year: '2022', make: 'Honda', model: 'Accord' },
      { year: '2021', make: 'Nissan', model: 'Altima' },
    ],
  },
  {
    id: '4',
    name: 'Premium Suspension Kit',
    price: 1899.99,
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=400&fit=crop&auto=format',
    category: 'Suspension',
    rating: 4.7,
    reviews: 124,
    inStock: true,
    featured: false,
    href: '/product/4',
    compatibility: [
      { year: '2023', make: 'Ford', model: 'F-150' },
      { year: '2022', make: 'Chevrolet', model: 'Silverado' },
      { year: '2021', make: 'Toyota', model: 'Camry' },
    ],
  },
  {
    id: '5',
    name: 'Luxury Exhaust System',
    price: 2199.99,
    originalPrice: 2599.99,
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=400&fit=crop&auto=format',
    category: 'Exhaust',
    rating: 4.8,
    reviews: 167,
    inStock: true,
    featured: true,
    href: '/product/5',
    compatibility: [
      { year: '2023', make: 'BMW', model: 'X5' },
      { year: '2022', make: 'Mercedes', model: 'C-Class' },
      { year: '2021', make: 'Audi', model: 'A4' },
    ],
  },
  {
    id: '6',
    name: 'Premium Turbocharger',
    price: 3299.99,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop&auto=format',
    category: 'Performance',
    rating: 4.9,
    reviews: 78,
    inStock: true,
    featured: false,
    href: '/product/6',
    compatibility: [
      { year: '2023', make: 'Nissan', model: 'Altima' },
      { year: '2022', make: 'Toyota', model: 'Camry' },
      { year: '2021', make: 'Honda', model: 'Accord' },
    ],
  },
  {
    id: '7',
    name: 'Luxury Exhaust System',
    price: 2199.99,
    rating: 4.9,
    reviews: 78,
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&h=400&fit=crop&auto=format',
    href: '/product/7',
    category: 'Exhaust',
    featured: true,
    compatibility: [
      { year: '2023', make: 'Ford', model: 'F-150' },
      { year: '2022', make: 'Chevrolet', model: 'Silverado' },
      { year: '2021', make: 'Nissan', model: 'Altima' },
    ],
  },
  {
    id: '8',
    name: 'Premium Turbocharger',
    price: 3299.99,
    rating: 4.9,
    reviews: 78,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=400&fit=crop&auto=format',
    href: '/product/8',
    category: 'Performance',
    featured: false,
    compatibility: [
      { year: '2023', make: 'BMW', model: 'X5' },
      { year: '2022', make: 'Mercedes', model: 'C-Class' },
      { year: '2021', make: 'Audi', model: 'A4' },
    ],
  },
];

function ProductContent() {
  const searchParams = useSearchParams();
  const [filteredProducts, setFilteredProducts] = useState(products);
  
  useEffect(() => {
    // Get search parameters
    const year = searchParams.get('year');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const keyword = searchParams.get('q');
    
    // Filter products based on search parameters
    let filtered = products;
    
    if (year || make || model) {
      filtered = filtered.filter(product => 
        product.compatibility?.some(comp => 
          (!year || comp.year === year) &&
          (!make || comp.make === make) &&
          (!model || comp.model === model)
        )
      );
    }
    
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(lowerKeyword) ||
        product.category.toLowerCase().includes(lowerKeyword)
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchParams]);

  // Generate schema.org ItemList
  const itemListSchema = generateItemListSchema(
    filteredProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: 'USD',
      image: p.image,
    })),
    'All Products'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Schema.org structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <h1 className="text-3xl font-bold mb-4">All Products</h1>
      <p className="text-gray-600 mb-6">
        Explore our complete collection of premium products.
      </p>
      
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((p) => (
            <Suspense key={p.id} fallback={<ProductSkeleton variant="grid" /> }>
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                image={p.image}
                href={p.href}
                price={p.price}
                category={p.category}
                isFeatured={p.featured}
                onSale={false}
                discount={0}  
                category_id={""} 
              />
            </Suspense>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">All Products</h1>
          <p className="text-gray-600 mb-6">Loading products...</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} variant="grid" />
            ))}
          </div>
        </div>
      }
    >
      <ProductContent />
    </Suspense>
  );
}
