import { URLMetadata } from '../types/wishItem';

// Since we're in a browser environment, we'll use a CORS proxy service
// You might want to replace this with your own service or a paid service for production
const CORS_PROXY = 'https://api.codetabs.com/v1/proxy?quest=';
const ALTERNATIVE_PROXY = 'https://corsproxy.io/?';

interface MetaTagExtractor {
  extractFromHTML(html: string, url: string): URLMetadata;
}

class HTMLMetaExtractor implements MetaTagExtractor {
  extractFromHTML(html: string, url: string): URLMetadata {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const getMetaContent = (
      property: string,
      name?: string
    ): string | undefined => {
      // Try Open Graph first
      let meta = doc.querySelector(
        `meta[property="${property}"]`
      ) as HTMLMetaElement;
      if (!meta && name) {
        // Try standard meta name
        meta = doc.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      }
      if (!meta && property.startsWith('og:')) {
        // Try without og: prefix
        const simpleName = property.replace('og:', '');
        meta = doc.querySelector(
          `meta[name="${simpleName}"]`
        ) as HTMLMetaElement;
      }
      return meta?.content?.trim();
    };

    const title =
      getMetaContent('og:title') ||
      doc.querySelector('title')?.textContent?.trim() ||
      getMetaContent('twitter:title');

    const description =
      getMetaContent('og:description', 'description') ||
      getMetaContent('twitter:description');

    const image =
      getMetaContent('og:image') ||
      getMetaContent('twitter:image') ||
      getMetaContent('image');

    const siteName =
      getMetaContent('og:site_name') ||
      getMetaContent('application-name') ||
      new URL(url).hostname;

    // Try to extract price information
    const price =
      getMetaContent('product:price:amount') ||
      getMetaContent('og:price:amount') ||
      getMetaContent('price') ||
      this.extractPriceFromText(html);

    const currency =
      getMetaContent('product:price:currency') ||
      getMetaContent('og:price:currency') ||
      getMetaContent('currency');

    const availability =
      getMetaContent('product:availability') ||
      getMetaContent('og:availability');

    const type = getMetaContent('og:type') || 'website';

    return {
      title,
      description,
      image: image ? this.resolveImageUrl(image, url) : undefined,
      siteName,
      price,
      currency,
      availability,
      type
    };
  }

  private extractPriceFromText(html: string): string | undefined {
    // Common price patterns
    const pricePatterns = [
      /\$[\d,]+\.?\d*/g,
      /€[\d,]+\.?\d*/g,
      /£[\d,]+\.?\d*/g,
      /[\d,]+\.?\d*\s*USD/g,
      /[\d,]+\.?\d*\s*EUR/g,
      /[\d,]+\.?\d*\s*GBP/g
    ];

    for (const pattern of pricePatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }

    return undefined;
  }

  private resolveImageUrl(imageUrl: string, baseUrl: string): string {
    try {
      return new URL(imageUrl, baseUrl).href;
    } catch {
      return imageUrl;
    }
  }
}

export class URLMetadataService {
  private readonly extractor = new HTMLMetaExtractor();
  private readonly cache = new Map<string, URLMetadata>();
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  async fetchMetadata(url: string): Promise<URLMetadata> {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL provided');
    }

    // Check cache first
    const cachedData = this.cache.get(url);
    if (cachedData) {
      return cachedData;
    }

    try {
      // Try primary proxy first
      let html = await this.fetchHTML(CORS_PROXY + encodeURIComponent(url));

      if (!html || html.includes('error') || html.length < 100) {
        // Try alternative proxy
        html = await this.fetchHTML(
          ALTERNATIVE_PROXY + encodeURIComponent(url)
        );
      }

      if (!html || html.length < 100) {
        throw new Error('Could not fetch page content');
      }

      const metadata = this.extractor.extractFromHTML(html, url);

      // Cache the result
      this.cache.set(url, metadata);

      // Clean up old cache entries
      setTimeout(() => {
        this.cache.delete(url);
      }, this.CACHE_DURATION);

      return metadata;
    } catch (error) {
      console.warn('Failed to fetch metadata for', url, error);

      // Return basic metadata based on URL
      return {
        title: url,
        siteName: new URL(url).hostname,
        type: 'website'
      };
    }
  }

  private async fetchHTML(proxyUrl: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; Christmas Gift Exchange Bot)'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return html;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Helper method to check if a URL looks like a product page
  isProductURL(url: string): boolean {
    const productIndicators = [
      'amazon.com',
      'ebay.com',
      'etsy.com',
      'target.com',
      'walmart.com',
      'bestbuy.com',
      'apple.com',
      'nike.com',
      'adidas.com',
      'zalando',
      '/product/',
      '/item/',
      '/p/',
      '/dp/',
      '/buy/',
      '/shop/',
      'product',
      'item',
      'buy',
      'shop',
      'store'
    ];

    const lowerUrl = url.toLowerCase();
    return productIndicators.some((indicator) => lowerUrl.includes(indicator));
  }
}

export const urlMetadataService = new URLMetadataService();
