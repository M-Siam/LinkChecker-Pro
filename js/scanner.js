const blacklistSet = new Set(blacklist); // Optimize lookup

const scanLinks = async (urls) => {
  console.log('Scanning URLs:', urls);

  const results = [];
  const timeoutDuration = 8000; // 8 seconds

  for (const url of urls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    let result = {
      url,
      status: 'unknown',
      redirectChain: [],
      isRisky: false,
      error: null,
      timestamp: new Date().toISOString()
    };

    try {
      // Check blacklist first
      const domain = new URL(url).hostname.toLowerCase();
      result.isRisky = blacklistSet.has(domain) || Array.from(blacklistSet).some(b => domain.endsWith(`.${b}`));

      if (result.isRisky) {
        result.status = 'risky';
        result.error = '⚠️ Phishing or Risky Link (Blacklisted Domain)';
        clearTimeout(timeoutId);
        results.push(result);
        continue;
      }

      // Try fetch with CORS
      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.warn(`Fetch failed for ${url}, trying XMLHttpRequest:`, fetchError);
        // Fallback to XMLHttpRequest
        response = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, true);
          xhr.timeout = timeoutDuration;
          xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
              resolve({
                status: xhr.status || 0,
                url: xhr.responseURL || url,
                ok: xhr.status >= 200 && xhr.status < 300,
                redirected: xhr.responseURL && xhr.responseURL !== url
              });
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.ontimeout = () => reject(new Error('Timeout'));
          xhr.send();
        });
        clearTimeout(timeoutId);
      }

      // Handle response
      if (response.status >= 200 && response.status < 300) {
        result.status = response.status;
      } else if (response.status >= 300 && response.status < 400) {
        result.status = response.status;
      } else if (response.status >= 400) {
        result.status = response.status;
        result.error = `HTTP Error: ${response.status}`;
      } else {
        result.status = 'unreachable';
        result.error = 'No status code received';
      }

      if (response.redirected) {
        result.redirectChain = [url, response.url];
      } else {
        result.redirectChain = [url];
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message === 'Timeout') {
        result.status = 'timeout';
        result.error = 'Request timed out after 8 seconds';
      } else {
        result.status = 'unreachable';
        result.error = `Unreachable: ${error.message}`;
      }
    }

    // Classify status for sorting
    if (result.status >= 400) {
      result.status = 'broken';
    } else if (result.status >= 300 && result.status < 400) {
      result.status = 'redirect';
    } else if (result.status >= 200 && result.status < 300) {
      result.status = 'ok';
    }

    console.log(`Result for ${url}:`, result);
    results.push(result);
  }

  // Sort results: Risky > Broken > Redirect > OK
  results.sort((a, b) => {
    const order = { risky: 0, broken: 1, redirect: 2, ok: 3, timeout: 4, unreachable: 5 };
    return order[a.status] - order[b.status];
  });

  console.log('Scan results:', results);
  return results;
};
