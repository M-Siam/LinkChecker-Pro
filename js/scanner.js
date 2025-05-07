// Mock Link Scanner for Testing
const scanLinks = async (urls) => {
  console.log('Mock scanning URLs:', urls);

  // Simulate a delay to mimic network requests
  await new Promise(resolve => setTimeout(resolve, 1000));

  const results = urls.map((url, index) => {
    const domain = new URL(url).hostname.toLowerCase();
    const isRisky = blacklist.some(b => domain === b || domain.endsWith(`.${b}`));

    // Simulate different statuses for testing
    const mockStatuses = [200, 301, 404, 'unknown'];
    const status = mockStatuses[index % mockStatuses.length];
    let redirectChain = [];
    let error = null;

    if (status === 301 || status === 302) {
      redirectChain = [url, `https://redirect${index + 1}.com`];
    } else if (status === 'unknown') {
      error = 'Mock scan: Unable to verify status';
    }

    console.log(`Mock result for ${url}: Status ${status}`);
    return { url, status, redirectChain, isRisky, error };
  });

  console.log('Mock scan results:', results);
  return results;
};
