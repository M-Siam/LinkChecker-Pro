const blacklistSet = new Set(blacklist);

const scanLinks = async (urls) => {
  console.log('Scanning URLs:', urls);
  const results = [];
  const timeoutDuration = 8000;

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
      const domain = new URL(url).hostname.toLowerCase();
      result.isRisky = blacklistSet.has(domain) || Array.from(blacklistSet).some(b => domain.endsWith(`.${b}`));

      if (result.isRisky) {
        result.status = 'risky';
        result.error = '⚠️ Phishing or Risky Link (Blacklisted Domain)';
        clearTimeout(timeoutId);
        results.push(result);
        continue;
      }

      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal,
          redirect: 'manual' // Manual redirect to track chain
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        console.warn(`Fetch failed for ${url}, trying XMLHttpRequest:`, fetchError);
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
                redirected: xhr.responseURL && xhr.responseURL !== url,
                headers: { location: xhr.getResponseHeader('Location') }
              });
            }
          };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.ontimeout = () => reject(new Error('Timeout'));
          xhr.send();
        });
        clearTimeout(timeoutId);
      }

      // Handle redirect chain
      let currentUrl = url;
      result.redirectChain = [url];
      while (response.status >= 300 && response.status < 400 && response.headers?.location) {
        currentUrl = response.headers.location;
        result.redirectChain.push(currentUrl);
        try {
          response = await fetch(currentUrl, {
            method: 'HEAD',
            mode: 'cors',
            signal: controller.signal,
            redirect: 'manual'
          });
        } catch (fetchError) {
          response = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', currentUrl, true);
            xhr.timeout = timeoutDuration;
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                resolve({
                  status: xhr.status || 0,
                  url: xhr.responseURL || currentUrl,
                  ok: xhr.status >= 200 && xhr.status < 300,
                  redirected: xhr.responseURL && xhr.responseURL !== currentUrl,
                  headers: { location: xhr.getResponseHeader('Location') }
                });
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.ontimeout = () => reject(new Error('Timeout'));
            xhr.send();
          });
        }
      }

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

    // Classify status
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

  // Sort results
  results.sort((a, b) => {
    const order = { risky: 0, broken: 1, redirect: 2, ok: 3, timeout: 4, unreachable: 5 };
    return order[a.status] - order[b.status];
  });

  console.log('Scan results:', results);
  return results;
};
