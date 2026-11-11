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
    let debugInfo: any = null;
    if (source === 'nguonc' && !result.ok) {
      try {
        const start = Date.now();
        const testRes = await fetch(`https://phim.nguonc.com/api/film/${slug}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        const elapsed = Date.now() - start;
        const text = await testRes.text();
        debugInfo = {
          status: testRes.status,
          statusText: testRes.statusText,
          elapsed,
          bodySample: text.slice(0, 300),
        };
      } catch (err: any) {
        debugInfo = { error: err.message, name: err.name };
      }
    }

    return NextResponse.json({
      ok: result.ok,
      source,
      sourceName: SOURCES[source].name,
      episodes: result.episodes,
      debug: debugInfo,
    });
  } catch (error) {
    console.error(`Source API error for ${source}/${slug}:`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch from source' },
      { status: 500 }
    );
  }
}
