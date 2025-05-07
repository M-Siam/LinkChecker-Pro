// Blacklist from data/blacklist.js is assumed to be loaded globally
async function scanUrls(urls) {
    const results = [];
    const controller = new AbortController();
    const timeout = 5000; // 5s timeout per request

    const fetchWithRedirect = async (url, redirects = []) => {
        try {
            const response = await Promise.race([
                fetch(url, {
                    signal: controller.signal,
                    redirect: 'manual',
                    mode: 'no-cors' // GitHub Pages limitation
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);

            if (response.type === 'opaqueredirect') {
                // Handle redirect manually
                const redirectUrl = response.headers.get('location') || url;
                redirects.push(url);
                if (redirects.length > 5) {
                    return { statusCode: null, statusText: 'Too Many Redirects', redirectChain: redirects };
                }
                return await fetchWithRedirect(redirectUrl, redirects);
            }

            return {
                statusCode: response.status,
                statusText: response.statusText,
                redirectChain: redirects,
                url
            };
        } catch (error) {
            return {
                statusCode: null,
                statusText: error.message,
                redirectChain: redirects,
                url
            };
        }
    };

    await Promise.all(urls.map(async (url) => {
        url = url.trim();
        if (!url.startsWith('http')) url = 'https://' + url;

        const result = await fetchWithRedirect(url);
        result.isRisky = isRiskyDomain(url);
        results.push(result);
    }));

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