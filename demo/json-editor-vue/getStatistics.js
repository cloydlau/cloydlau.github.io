const name = 'json-editor-vue'
const initialPublishDate = '2020-07-15'
const date = new Date()
const currentDate = date.toISOString().split('T')[0]

async function fetchWithCache(url) {
  const cacheName = 'my-cache' // Name for the cache
  const cache = await caches.open(cacheName) // Open the cache

  // Check if the response is in the cache
  const cachedResponse = await cache.match(url)

  if (cachedResponse) {
    console.log(`[命中缓存] ${url}`)
    // If response is cached, return it
    return cachedResponse.json()
  }
  else {
    console.log(`[发起请求] ${url}`)
    // If response is not cached, fetch it from the network
    const response = await fetch(url)

    // Cache the response with a specific expiration time (e.g., 1 hour)
    if (response.ok) {
      const expirationTime = 60 * 60 // 1 hour in seconds
      const cacheOptions = {
        headers: {
          'Cache-Control': `max-age=${expirationTime}`, // Set cache expiration time
        },
      }
      await cache.put(url, response.clone(), new Response(null, cacheOptions))
    }
    return response.json()
  }
}

function npmDownloads() {
  return fetchWithCache(`https://api.npmjs.org/downloads/range/${initialPublishDate}:${currentDate}/${name}`).then((data) => {
    const res = data.downloads.reduce((acc, day) => acc + day.downloads, 0)
    console.log(`Total npm downloads: ${res}`)
    return res
  })
}

function jsDelivrDownloads() {
  return fetchWithCache(`https://data.jsdelivr.com/v1/stats/packages/npm/${name}?period=all`).then((data) => {
    console.log(`Total jsDelivr downloads: ${data.hits.total}`)
    return data.hits.total
  })
}

function githubStars() {
  return fetchWithCache(`https://api.github.com/repos/cloydlau/${name}`).then((data) => {
    console.log(`Total GitHub Stars: ${data.stargazers_count}`)
    return data.stargazers_count ? `${data.stargazers_count} 🆘` : '🆘'
  })
}

export default () => Promise.all([npmDownloads(), jsDelivrDownloads(), githubStars()]).then(([npmDownloads, jsDelivrDownloads, githubStars]) => ({
  npmDownloads,
  jsDelivrDownloads,
  unpkgDownloads: 'unknown❓',
  githubStars,
}))
