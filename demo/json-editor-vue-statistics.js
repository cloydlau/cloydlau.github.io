const name = 'json-editor-vue'
const initialPublishDate = '2020-07-15'
const initialPublishYear = Number(initialPublishDate.substring(0, 4))
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
    const totalDownloads = data.downloads.reduce((acc, day) => acc + day.downloads, 0)
    console.log(`Total npm downloads: ${totalDownloads}`)
    return totalDownloads
  })
}

const currentYear = date.getFullYear()
const currentMonth = date.getMonth()
const pastYears = Array.from({ length: currentYear - initialPublishYear }, (_, i) => (i + initialPublishYear).toString())
const pastMonthsOfCurrentYear = Array.from({ length: currentMonth }, (_, i) => (i + 1).toString().padStart(2, '0'))

for (const item of pastMonthsOfCurrentYear) {
  pastYears.push(`${currentYear}-${item}`)
}

function jsDelivrDownloads() {
  return Promise.allSettled(Array.from(pastYears, period => fetchWithCache(`https://data.jsdelivr.com/v1/stats/packages/npm/${name}?period=${period}`))).then((results) => {
    const totalDownloads = results.reduce((acc, { value }) => acc + (value.hits?.total || 0), 0)
    console.log(`Total jsDelivr downloads: ${totalDownloads}`)
    return totalDownloads
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
