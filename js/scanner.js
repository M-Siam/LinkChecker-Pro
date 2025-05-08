async function scanLinks(urls) {
  console.log('Starting link scan for:', urls);
  const results = [];
  const useProxy = false; // Toggle for CORS proxy (can be made dynamic in UI)
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Public CORS proxy (requires activation)

  for (const url of urls) {
    const result = {
      url,
      status: 'unknown',
      redirectChain: [url],
      error: null,
      timestamp: new Date().toISOString(),
      isRisky: blacklist.includes(new URL(url).hostname)
    };

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      result.status = 'invalid';
      result.error = 'Invalid URL format';
      results.push(result);
      console.warn(`Invalid URL: ${url}`, e);
      continue;
    }

    // Check if URL is blacklisted
    if (result.isRisky) {
      result.status = 'risky';
      result.error = 'Domain is blacklisted';
      results.push(result);
      console.log(`Blacklisted URL: ${url}`);
      continue;
    }

    // Set up timeout and fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const fetchUrl = useProxy ? `${proxyUrl}${url}` : url;

    try {
      const response = await fetch(fetchUrl, {
        method: 'HEAD', // Lightweight request
        redirect: 'follow', // Follow redirects
        signal: controller.signal,
        headers: {
          'Accept': '*/*',
          'User-Agent': 'LinkCheckrPro/1.0'
        },
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      // Capture redirect chain
      if (response.redirected) {
        result.redirectChain = [url, response.url];
        console.log(`Redirect detected for ${url}: ${result.redirectChain.join(' → ')}`);
      }

      // Categorize status based on HTTP code
      const statusCode = response.status;
      if (statusCode === 200) {
        result.status = 'ok';
      } else if (statusCode === 301 || statusCode === 302) {
        result.status = 'redirect';
      } else if (statusCode >= 400 && statusCode < 600) {
        result.status = 'broken';
        result.error = `HTTP ${statusCode} ${response.statusText}`;
      } else {
        result.status = 'unknown';
        result.error = `Unexpected status: ${statusCode}`;
      }

      console.log(`Scan result for ${url}: ${result.status}`);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        result.status = 'timeout';
        result.error = 'Request timed out after 10 seconds';
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        // Likely CORS or DNS issue
        result.status = 'unreachable';
        result.error = 'Unable to reach server (possible CORS or DNS issue)';
        // Suggest CORS proxy
        result.error += '. Try enabling CORS proxy in settings (e.g., cors-anywhere.herokuapp.com).';
      } else {
        result.status = 'unknown';
        result.error = error.message || 'Unknown error occurred';
      }

      console.warn(`Error scanning ${url}:`, error);
    }

    results.push(result);
  }

  console.log('Scan completed:', results);
  return results;
}
