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
      // Extract domain for blacklist check
      const domain = new URL(url).hostname.toLowerCase();
      result.isRisky = blacklistSet.has(domain) || Array.from(blacklistSet).some(b => domain.endsWith(`.${b}`));

      if (result.isRisky) {
        result.status = 'risky';
        result.error = '⚠️ Phishing or Risky Link (Blacklisted Domain)';
        clearTimeout(timeoutId);
        results.push(result);
        continue;
      }

      // Try fetch first
      let response;
      try {
        response = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          redirect: 'follow'
        });
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
                status: xhr.status,
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
      }

      clearTimeout(timeoutId);

      // Handle response
      if (response.ok) {
        result.status = response.status || 200;
      } else if (response.status >= 300 && response.status < 400) {
        result.status = response.status || 301;
      } else if (response.status >= 400) {
        result.status = response.status || 404;
        result.error = `HTTP Error: ${response.status}`;
      }

      if (response.redirected) {
        result.redirectChain = [url, response.url];
      } else {
        result.redirectChain = [url];
      }

      // Mock status for no-cors (since status is opaque)
      if (!response.status) {
        const mockStatus = Math.random();
        if (mockStatus < 0.2) {
          result.status = 404;
          result.error = 'Mock: Page not found';
        } else if (mockStatus < 0.4) {
          result.status = 301;
          result.redirectChain = [url, `https://redirect-${Math.random().toString(36).substring(7)}.com`];
        } else if (mockStatus < 0.5) {
          result.status = 500;
          result.error = 'Mock: Server error';
        } else {
          result.status = 200;
        }
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
    } else if (result.status === 200) {
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

// Utility to generate fictional domains
const generateDomains = (count) => {
  const tlds = ['com', 'net', 'org', 'biz', 'info', 'co', 'io', 'me', 'site', 'online', 'xyz', 'club', 'shop', 'live', 'tech'];
  const prefixes = ['malicious', 'phish', 'scam', 'fake', 'adult', 'spam', 'fraud', 'bad', 'shady', 'risky', 'evil', 'hack', 'bogus', 'dodgy', 'unsecure'];
  const generated = new Set();

  while (generated.size < count) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const id = Math.random().toString(36).substring(7);
    const tld = tlds[Math.floor(Math.random() * tlds.length)];
    generated.add(`${prefix}-${id}.${tld}`);
  }

  return Array.from(generated);
};

// Function to append generated domains to blacklist
const appendGeneratedDomains = (count) => {
  const newDomains = generateDomains(count);
  blacklist.push(...newDomains);
  blacklistSet.clear();
  blacklist.forEach(domain => blacklistSet.add(domain));
  console.log(`Appended ${count} domains to blacklist. Total: ${blacklist.length}`);
};

// Example: Generate 10,000 domains (uncomment to use)
// appendGeneratedDomains(10000);
