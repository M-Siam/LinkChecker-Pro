const scanLinks = async (urls) => {
  console.log('Scanning URLs:', urls);

  const results = [];
  const timeoutDuration = 8000; // 8 seconds

  for (const url of urls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    const domain = new URL(url).hostname.toLowerCase();
    const isRisky = blacklist.some(b => domain === b || domain.endsWith(`.${b}`));

    let result = { url, status: 'unknown', redirectChain: [], isRisky, error: null };

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // Use no-cors to avoid CORS issues
        signal: controller.signal,
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      // Since no-cors mode returns opaque responses, we can't rely on status codes directly
      // Instead, assume success if fetch completes without errors
      result.status = response.ok ? 200 : 'unknown';
      result.redirectChain = response.redirected ? [url, response.url] : [url];

      // Mock status for testing (since no-cors hides real status)
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
      }

      if (isRisky) {
        result.status = 'risky';
        result.error = '⚠️ Risky / Spam (Blacklisted Domain)';
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        result.status = 'timeout';
        result.error = 'Request timed out after 8 seconds';
      } else {
        result.status = 'unknown';
        result.error = `Fetch error: ${error.message}`;
      }
    }

    console.log(`Result for ${url}:`, result);
    results.push(result);
  }

  // Sort results: Risky and Broken first
  results.sort((a, b) => {
    if (a.status === 'risky' && b.status !== 'risky') return -1;
    if (a.status !== 'risky' && b.status === 'risky') return 1;
    if (['broken', 404, 500].includes(a.status) && !['broken', 404, 500].includes(b.status)) return -1;
    if (!['broken', 404, 500].includes(a.status) && ['broken', 404, 500].includes(b.status)) return 1;
    return 0;
  });

  console.log('Scan results:', results);
  return results;
};

// Rescan a single link
const rescanLink = async (url) => {
  const results = await scanLinks([url]);
  return results[0];
};
