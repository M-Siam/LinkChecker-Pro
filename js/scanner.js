// Link Scanner
const scanLinks = async (urls) => {
  console.log('Scanning URLs:', urls);
  const results = await Promise.all(urls.map(async (url) => {
    try {
      // Attempt fetch with HEAD request
      const response = await fetchWithTimeout(url, { 
        method: 'HEAD', 
        redirect: 'manual',
        mode: 'cors',
        cache: 'no-cache'
      }, 5000);

      let status = response.status;
      let redirectChain = [];
      let error = null;

      if (status === 301 || status === 302) {
        redirectChain = await getRedirectChain(url);
      }

      const domain = new URL(url).hostname.toLowerCase();
      const isRisky = blacklist.some(b => domain === b || domain.endsWith(`.${b}`));

      return { url, status, redirectChain, isRisky, error };
    } catch (error) {
      console.warn(`Error scanning ${url}: ${error.message}`);
      const domain = new URL(url).hostname.toLowerCase();
      const isRisky = blacklist.some(b => domain === b || domain.endsWith(`.${b}`));
      
      // Handle CORS or timeout errors
      let errorMessage = 'Unable to scan (possible CORS restriction or timeout)';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out';
      } else if (error.message.includes('network error')) {
        errorMessage = 'Network error (check URL or connectivity)';
      }

      return { 
        url, 
        status: 'unknown', 
        redirectChain: [], 
        isRisky, 
        error: errorMessage 
      };
    }
  }));
  console.log('Scan results:', results);
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
  if (depth > 10) {
    console.warn(`Redirect chain for ${url} exceeded depth limit`);
    return chain;
  }
  try {
    const response = await fetchWithTimeout(url, { 
      method: 'HEAD', 
      redirect: 'manual',
      mode: 'cors'
    }, 3000);
    const location = response.headers.get('location');
    if (location && isValidUrl(location)) {
      chain.push(location);
      return await getRedirectChain(location, chain, depth + 1);
    }
    return chain;
  } catch (error) {
    console.warn(`Error in redirect chain for ${url}: ${error.message}`);
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
