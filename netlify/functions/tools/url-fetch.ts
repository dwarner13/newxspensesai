/**
 * URL Fetch Tool - Fetches URL content and extracts clean text
 */

interface UrlFetchParams {
  url: string;
}

interface UrlFetchResult {
  snippet?: string;
  summary?: string;
  error?: string;
}

/**
 * Fetch URL, strip HTML, and return snippet and summary
 */
export async function urlFetchTool(params: UrlFetchParams): Promise<UrlFetchResult> {
  const { url } = params;
  
  if (!url || typeof url !== 'string') {
    return { error: 'Invalid URL parameter' };
  }
  
  try {
    // Fetch URL with redirect following
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URLFetchTool/1.0)',
      },
    });
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML/text content
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { error: `Unsupported content type: ${contentType}` };
    }
    
    // Read response text
    const html = await response.text();
    
    // Strip HTML tags, scripts, and styles
    let text = stripHTML(html);
    
    // Trim whitespace
    text = trimWhitespace(text);
    
    // Extract snippet (first 4000 chars) and summary (first 600 chars)
    const snippet = text.substring(0, 4000);
    const summary = text.substring(0, 600);
    
    return {
      snippet: snippet || undefined,
      summary: summary || undefined,
    };
    
  } catch (error: any) {
    // Handle network errors gracefully
    console.error('[url-fetch] Error fetching URL:', error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { error: 'Network error: Unable to fetch URL' };
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return { error: `Connection error: ${error.message}` };
    }
    
    return { error: `Fetch failed: ${error.message || 'Unknown error'}` };
  }
}

/**
 * Strip HTML tags, scripts, and styles from text
 */
function stripHTML(html: string): string {
  let text = html;
  
  // Remove script tags and their content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove noscript tags and their content
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Decode numeric entities (basic)
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode hex entities (basic)
  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return text;
}

/**
 * Trim excessive whitespace
 */
function trimWhitespace(text: string): string {
  // Replace multiple spaces with single space
  text = text.replace(/[ \t]+/g, ' ');
  
  // Replace multiple newlines with double newline (paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim start and end
  text = text.trim();
  
  return text;
}


