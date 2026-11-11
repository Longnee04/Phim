import { NextRequest, NextResponse } from 'next/server';
import { fetchEpisodesFromSource, SourceType, SOURCES } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/source?slug=movie-slug&source=ophim
 * Fetches episodes from a specific source, server-side to avoid CORS.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const source = searchParams.get('source') as SourceType;

  if (!slug || !source || !SOURCES[source]) {
    return NextResponse.json(
      { ok: false, error: 'Missing or invalid slug/source parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await fetchEpisodesFromSource(slug, source);
    return NextResponse.json({
      ok: result.ok,
      source,
      sourceName: SOURCES[source].name,
      episodes: result.episodes,
    });
  } catch (error) {
    console.error(`Source API error for ${source}/${slug}:`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch from source' },
      { status: 500 }
    );
  }
}
