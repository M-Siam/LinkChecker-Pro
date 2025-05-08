async function scanLinks(urls) {
  console.log('Starting link scan for:', urls);
  const results = [];
  const useProxy = false; // Toggle for CORS proxy (can be made dynamic in UI)
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Public CORS proxy

  for (let url of urls) {
    url = url.trim();
    const result = {
      url,
      status: 'unknown',
      redirectChain: [url],
      error: null,
      timestamp: new Date().toISOString(),
      isRisky: false
    };

    // Normalize and validate URL
    let normalizedUrl = url;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    let hostname;
    try {
      hostname = new URL(normalizedUrl).hostname.toLowerCase();
    } catch (e) {
      result.status = 'invalid';
      result.error = 'Invalid URL format';
      results.push(result);
      console.warn(`Invalid URL: ${url}`, e);
      continue;
    }

    // Check blacklist
    result.isRisky = blacklist.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    if (result.isRisky) {
      result.status = 'risky';
      result.error = 'Domain is blacklisted';
      results.push(result);
      console.log(`Blacklisted URL: ${url} (hostname: ${hostname})`);
      continue;
    }

    // Attempt scanning with HTTP/HTTPS
    const protocols = [normalizedUrl];
    if (normalizedUrl.startsWith('http://')) {
      protocols.push(normalizedUrl.replace('http://', 'https://'));
    }

    let response = null;
    let lastError = null;
    for (const tryUrl of protocols) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const fetchUrl = useProxy ? `${proxyUrl}${tryUrl}` : tryUrl;

      try {
        response = await fetch(fetchUrl, {
          method: 'HEAD',
          redirect: 'manual', // Manual redirect to capture status
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
            'User-Agent': 'LinkCheckrPro/1.0'
          },
          mode: 'cors'
        });

        clearTimeout(timeoutId);
        lastError = null;
        break; // Success, exit protocol loop
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        console.warn(`Fetch failed for ${tryUrl}:`, error);
      }
    }

    if (response) {
      // Handle status codes
      const statusCode = response.status;
      if (statusCode === 200) {
        result.status = 'ok';
      } else if (statusCode === 301 || statusCode === 302) {
        result.status = 'redirect';
        const redirectUrl = response.headers.get('location');
        if (redirectUrl) {
          result.redirectChain.push(redirectUrl);
          console.log(`Redirect for ${url}: ${result.redirectChain.join(' → ')}`);
          // Follow redirect manually (up to 3 hops)
          let hops = 0;
          let currentUrl = redirectUrl;
          while (hops < 3 && (statusCode === 301 || statusCode === 302)) {
            const hopController = new AbortController();
            const hopTimeout = setTimeout(() => hopController.abort(), 5000);
            try {
              const hopResponse = await fetch(useProxy ? `${proxyUrl}${currentUrl}` : currentUrl, {
                method: 'HEAD',
                redirect: 'manual',
                signal: hopController.signal,
                headers: { 'Accept': '*/*', 'User-Agent': 'LinkCheckrPro/1.0' },
                mode: 'cors'
              });
              clearTimeout(hopTimeout);
              if (hopResponse.status === 301 || hopResponse.status === 302) {
                currentUrl = hopResponse.headers.get('location');
                if (currentUrl) {
                  result.redirectChain.push(currentUrl);
                }
              } else if (hopResponse.status === 200) {
                result.status = 'ok'; // Final destination is OK
                break;
              } else {
                result.status = 'broken';
                result.error = `HTTP ${hopResponse.status} ${hopResponse.statusText}`;
                break;
              }
              hops++;
            } catch (error) {
              clearTimeout(hopTimeout);
              result.status = 'unreachable';
              result.error = `Redirect follow failed: ${error.message}`;
              break;
            }
          }
        }
      } else if (statusCode >= 400 && statusCode < 600) {
        result.status = 'broken';
        result.error = `HTTP ${statusCode} ${response.statusText}`;
      } else {
        result.status = 'unknown';
        result.error = `Unexpected status: ${statusCode}`;
      }
      console.log(`Scan result for ${url}: ${result.status}`);
    } else {
      // Handle errors
      if (lastError.name === 'AbortError') {
        result.status = 'timeout';
        result.error = 'Request timed out after 10 seconds';
      } else if (lastError.name === 'TypeError' && lastError.message.includes('Failed to fetch')) {
        result.status = 'unreachable';
        result.error = 'Unable to reach server (possible CORS, DNS, or protocol issue). Try enabling CORS proxy or HTTPS.';
      } else {
        result.status = 'unknown';
        result.error = lastError.message || 'Unknown error occurred';
      }
      console.warn(`Error scanning ${url}:`, lastError);
    }

    results.push(result);
  }

  console.log('Scan completed:', results);
  return results;
}
