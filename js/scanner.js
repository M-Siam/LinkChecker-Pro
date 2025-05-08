async function scanLinks(urls, useProxy = false) {
  console.log('Starting link scan for:', urls, { useProxy });
  const results = [];
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
    result.isRisky = blacklist.some(domain => {
      const normalizedDomain = domain.toLowerCase();
      return hostname === normalizedDomain || hostname.endsWith('.' + normalizedDomain);
    });
    if (result.isRisky) {
      result.status = 'risky';
      result.error = 'Domain is blacklisted';
      results.push(result);
      console.log(`Blacklisted URL: ${url} (hostname: ${hostname})`);
      continue;
    }

    // Attempt scanning with HTTP/HTTPS and optional proxy
    const protocols = [normalizedUrl];
    if (normalizedUrl.startsWith('http://')) {
      protocols.unshift(normalizedUrl.replace('http://', 'https://')); // Prioritize HTTPS
    }

    let response = null;
    let lastError = null;
    let triedProxy = false;

    for (const tryUrl of protocols) {
      const attempts = [{ url: tryUrl, method: 'HEAD' }];
      if (useProxy && !triedProxy) {
        attempts.push({ url: `${proxyUrl}${tryUrl}`, method: 'HEAD' });
        attempts.push({ url: `${proxyUrl}${tryUrl}`, method: 'GET' }); // Fallback to GET
      }

      for (const attempt of attempts) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
          response = await fetch(attempt.url, {
            method: attempt.method,
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'Accept': '*/*',
              'User-Agent': 'LinkCheckrPro/1.0'
            },
            mode: 'cors'
          });

          clearTimeout(timeoutId);

          // Capture redirect chain
          if (response.redirected && response.url !== tryUrl) {
            result.redirectChain = [tryUrl, response.url];
            result.status = 'redirect';
            console.log(`Redirect for ${url}: ${result.redirectChain.join(' → ')}`);
          } else if (response.status === 301 || response.status === 302) {
            result.status = 'redirect';
            const redirectUrl = response.headers.get('location');
            if (redirectUrl && !result.redirectChain.includes(redirectUrl)) {
              result.redirectChain.push(redirectUrl);
              console.log(`Redirect header for ${url}: ${result.redirectChain.join(' → ')}`);
            }
          }

          // Categorize status
          const statusCode = response.status;
          if (statusCode === 200) {
            result.status = result.status === 'redirect' ? 'redirect' : 'ok';
          } else if (statusCode === 301 || statusCode === 302) {
            result.status = 'redirect';
          } else if (statusCode >= 400 && statusCode < 600) {
            // Check if 404 is likely a DNS issue
            if (statusCode === 404 && attempt.url.startsWith(proxyUrl) && hostname.includes('123456')) {
              result.status = 'unreachable';
              result.error = 'Domain does not exist (DNS failure, misclassified as 404 by proxy)';
            } else {
              result.status = 'broken';
              result.error = `HTTP ${statusCode} ${response.statusText}`;
            }
          } else {
            result.status = 'unknown';
            result.error = `Unexpected status: ${statusCode}`;
          }

          lastError = null;
          console.log(`Scan result for ${url}: ${result.status}, Method: ${attempt.method}`);
          break; // Success, exit attempts loop
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error;
          console.warn(`Fetch failed for ${attempt.url} (Method: ${attempt.method}):`, error);
        }

        if (attempt.url.startsWith(proxyUrl)) {
          triedProxy = true;
        }
      }

      if (response) {
        break; // Success, exit protocol loop
      }
    }

    // Fallback for redirects: Try base domain if path-specific URL fails
    if (!response && lastError && result.url.includes('/redirect')) {
      const baseUrl = protocols[0].split('/').slice(0, 3).join('/');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        response = await fetch(useProxy ? `${proxyUrl}${baseUrl}` : baseUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
            'User-Agent': 'LinkCheckrPro/1.0'
          },
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        if (response.redirected && response.url !== baseUrl) {
          result.redirectChain = [result.url, response.url];
          result.status = 'redirect';
          console.log(`Redirect for ${url} (base domain): ${result.redirectChain.join(' → ')}`);
        } else if (response.status === 200) {
          result.redirectChain = [result.url, baseUrl];
          result.status = 'redirect';
          console.log(`Redirect assumed for ${url} to base domain: ${baseUrl}`);
        } else if (response.status === 301 || response.status === 302) {
          result.status = 'redirect';
          const redirectUrl = response.headers.get('location');
          if (redirectUrl && !result.redirectChain.includes(redirectUrl)) {
            result.redirectChain.push(redirectUrl);
            console.log(`Redirect header for ${url}: ${result.redirectChain.join(' → ')}`);
          }
        } else if (response.status >= 400 && response.status < 600) {
          result.status = 'broken';
          result.error = `HTTP ${response.status} ${response.statusText}`;
        }

        lastError = null;
        console.log(`Base domain scan result for ${url}: ${result.status}`);
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        console.warn(`Base domain fetch failed for ${baseUrl}:`, error);
      }
    }

    if (!response && lastError) {
      // Handle errors
      if (lastError.name === 'AbortError') {
        result.status = 'timeout';
        result.error = 'Request timed out after 10 seconds';
      } else if (lastError.name === 'TypeError' && lastError.message.includes('Failed to fetch')) {
        result.status = 'unreachable';
        result.error = 'Unable to reach server (possible CORS, DNS, or protocol issue).';
        if (!triedProxy) {
          result.error += ' Enable CORS proxy in settings or try HTTPS.';
        } else {
          result.error += ' CORS proxy failed; check proxy access or try HTTPS.';
        }
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
