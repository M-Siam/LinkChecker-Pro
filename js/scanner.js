// Blacklist from data/blacklist.js is assumed to be loaded globally
async function scanUrls(urls) {
    const results = [];
    const timeout = 5000; // 5s timeout per request

    const fetchWithRedirect = async (url, redirects = [], visited = new Set()) => {
        // Prevent infinite redirect loops
        if (visited.has(url) || redirects.length > 5) {
            return {
                statusCode: null,
                statusText: visited.has(url) ? 'Redirect Loop Detected' : 'Too Many Redirects',
                redirectChain: redirects,
                url
            };
        }
        visited.add(url);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                redirect: 'manual',
                mode: 'no-cors' // GitHub Pages limitation
            });

            clearTimeout(timeoutId);

            if (response.type === 'opaqueredirect') {
                const redirectUrl = response.headers.get('location') || url;
                redirects.push(url);
                return await fetchWithRedirect(redirectUrl, redirects, visited);
            }

            return {
                statusCode: response.status || null,
                statusText: response.statusText || 'Unknown',
                redirectChain: redirects,
                url
            };
        } catch (error) {
            clearTimeout(timeoutId);
            return {
                statusCode: null,
                statusText: error.name === 'AbortError' ? 'Request Timeout' : error.message || 'Failed to Fetch',
                redirectChain: redirects,
                url
            };
        }
    };

    // Process URLs sequentially to avoid overwhelming the browser
    for (const url of urls) {
        let cleanUrl = url.trim();
        // Ensure URL has a protocol
        if (!cleanUrl.match(/^https?:\/\//)) {
            cleanUrl = 'https://' + cleanUrl;
        }
        // Validate URL format
        try {
            new URL(cleanUrl);
            const result = await fetchWithRedirect(cleanUrl);
            result.isRisky = isRiskyDomain(cleanUrl);
            results.push(result);
        } catch {
            results.push({
                statusCode: null,
                statusText: 'Invalid URL',
                redirectChain: [],
                url: cleanUrl,
                isRisky: false
            });
        }
    }

    return results;
}

function isRiskyDomain(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        return blacklist.some(b => domain.includes(b.toLowerCase()));
    } catch {
        return false;
    }
}
