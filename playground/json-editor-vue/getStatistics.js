const name = 'json-editor-vue'
// const initialPublishDate = '2020-07-15'
const date = new Date()

function formateDate(date) {
  return date.toISOString().split('T')[0]
}

/* function getLastMonthToday(date) {
  const today = date.getDate()
  // 设置日期为上个月同一天，但如果无效则自动调整
  date.setMonth(date.getMonth() - 1)

  // 如果设置的日期结果在未来，则说明上个月没有对应的今天（例如31号）
  if (date.getDate() !== today) {
    date.setDate(0) // 设置为上个月的最后一天
  }

  return date
} */

function getLastYearToday(date) {
  const today = date.getDate()
  // 设置日期为上个月同一天，但如果无效则自动调整
  date.setMonth(date.getMonth() - 12)

  // 如果设置的日期结果在未来，则说明上个月没有对应的今天（例如31号）
  if (date.getDate() !== today) {
    date.setDate(0) // 设置为上个月的最后一天
  }

  return date
}

const currentDate = formateDate(date)
// const lastMonthToday = formateDate(getLastMonthToday(date))
const lastYearToday = formateDate(getLastYearToday(date))

async function fetchWithCache(...args) {
  const [url] = args
  const cache = await caches.open(name) // 打开缓存
  const cachedResponse = await cache.match(url) // 检查是否有缓存

  if (cachedResponse) {
    const data = await cachedResponse.json()
    const isExpired = Date.now() > data.expiry // 判断缓存是否过期
    if (!isExpired) {
      console.info(`[命中缓存] ${url}`)
      return data.response
    }
  }

  console.info(`[发起请求] ${url}`)
  const response = await fetch(...args) // 发起新请求
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
  // 总量，但存在跨域限制：
  // `https://npm-stat.com/api/download-counts?package=json-editor-vue&from=${initialPublishDate}&until=${currentDate}`
  // 最大支持18个月：
  return fetchWithCache(`https://api.npmjs.org/downloads/range/${lastYearToday}:${currentDate}/${name}`).then((data) => {
    const res = data.downloads.reduce((acc, day) => acc + day.downloads, 0).toLocaleString()
    console.info(`npm downloads: ${res}/year`)
    return `${res}/year`
  })
}

function cnpmDownloads() {
  return fetchWithCache(`https://registry.npmmirror.com/downloads/range/${lastYearToday}:${currentDate}/${name}`).then((data) => {
    const res = data.downloads.reduce((acc, day) => acc + day.downloads, 0).toLocaleString()
    console.info(`cnpm downloads: ${res}/year`)
    return `${res}/year`
  })
}

function jsrDownloads() {
  return fetchWithCache('https://jsr.io/api/scopes/cloydlau/packages/json-editor-vue/downloads').then((data) => {
    const res = data.total.reduce((acc, timeBucket) => acc + timeBucket.count, 0).toLocaleString()
    console.info(`jsr downloads: ${res}/quarter`)
    return `${res}/quarter`
  })
}

function jsDelivrDownloads() {
  return fetchWithCache(`https://data.jsdelivr.com/v1/stats/packages/npm/${name}?period=all`).then((data) => {
    console.info(`Total jsDelivr downloads: ${data.hits.total}`)
    return data.hits.total.toLocaleString()
  })
}

function githubStars() {
  return fetchWithCache(`https://api.github.com/repos/cloydlau/${name}`).then((data) => {
    console.info(`Total GitHub Stars: ${data.stargazers_count}`)
    return data.stargazers_count ? `${data.stargazers_count.toLocaleString()} 🆘` : '🆘'
  })
}

export default () => Promise.allSettled([npmDownloads(), cnpmDownloads(), jsrDownloads(), jsDelivrDownloads(), githubStars()]).then(([{ value: npmDownloads }, { value: cnpmDownloads }, { value: jsrDownloads }, { value: jsDelivrDownloads }, { value: githubStars }]) => ({
  npmDownloads,
  cnpmDownloads,
  jsrDownloads,
  jsDelivrDownloads,
  unpkgDownloads: 'unknown❓',
  githubStars,
}))
