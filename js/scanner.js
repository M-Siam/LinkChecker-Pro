// Link Scanner
const scanLinks = async (urls) => {
  const results = await Promise.all(urls.map(async (url) => {
    try {
      // Use a proxy to bypass CORS restrictions (Note: This is a placeholder; replace with a real proxy if needed)
      const response = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'manual' }, 5000);
      let status = response.status;
      let redirectChain = [];

      if (status === 301 || status === 302) {
        redirectChain = await getRedirectChain(url);
      }

      const domain = new URL(url).hostname.toLowerCase();
      const isRisky = blacklist.some(b => domain === b || domain.endsWith(`.${b}`));

      return { url, status, redirectChain, isRisky };
    } catch (error) {
      console.warn(`Error scanning ${url}: ${error.message}`);
      return { url, status: 'unknown', redirectChain: [], isRisky: false };
    }
  }));
  return results;
};

// Fetch with Timeout
const fetchWithTimeout = async (url, options, timeout) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Redirect Chain Detection
const getRedirectChain = async (url, chain = [url], depth = 0) => {
  if (depth > 10) return chain; // Prevent infinite redirects
  try {
    const response = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'manual' }, 3000);
    const location = response.headers.get('location');
    if (location && isValidUrl(location)) {
      chain.push(location);
      return await getRedirectChain(location, chain, depth + 1);
    }
    return chain;
  } catch (error) {
    return chain;
  }
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};