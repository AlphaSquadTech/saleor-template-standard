import { NextRequest, NextResponse } from 'next/server';
import { fetchDynamicPageBySlug } from '@/graphql/queries/getDynamicPageBySlug';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    console.log(`[API] Fetching dynamic page: ${slug}`);
    
    const pageData = await fetchDynamicPageBySlug(slug);
    
    if (!pageData) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json(pageData);
  } catch (error) {
    console.error('[API] Error fetching dynamic page:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}