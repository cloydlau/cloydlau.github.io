const name = 'json-editor-vue'
const initialPublishDate = '2020-07-15'
const date = new Date()
const currentDate = date.toISOString().split('T')[0]

async function fetchWithCache(url) {
  const cache = await caches.open(name) // 打开缓存
  const cachedResponse = await cache.match(url) // 检查是否有缓存

  if (cachedResponse) {
    const data = await cachedResponse.json()
    const isExpired = Date.now() > data.expiry // 判断缓存是否过期
    if (!isExpired) {
      console.log(`[命中缓存] ${url}`)
      return data.response
    }
  }

  console.log(`[发起请求] ${url}`)
  const response = await fetch(url) // 发起新请求
  if (response.ok) {
    const responseBody = await response.json()
    const expirationTime = 60 * 60 * 1000 // 缓存过期时间（例如，1小时）
    const cacheData = {
      expiry: Date.now() + expirationTime,
      response: responseBody,
    }
    await cache.put(url, new Response(JSON.stringify(cacheData))) // 存储带有时间戳的数据
    return responseBody
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

export default () => Promise.allSettled([npmDownloads(), jsDelivrDownloads(), githubStars()]).then(([{ value: npmDownloads }, { value: jsDelivrDownloads }, { value: githubStars }]) => ({
  npmDownloads,
  jsDelivrDownloads,
  unpkgDownloads: 'unknown❓',
  githubStars,
}))
