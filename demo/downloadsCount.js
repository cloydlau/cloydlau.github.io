const name = 'json-editor-vue'
const initialPublishDate = '2020-07-15'
const initialPublishYear = Number(initialPublishDate.substring(0, 4))
const date = new Date()
const currentDate = date.toISOString().split('T')[0]

function npm() {
  return fetch(`https://api.npmjs.org/downloads/range/${initialPublishDate}:${currentDate}/${name}`).then(response => response.json()).then((data) => {
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

function jsdelivr() {
  return Promise.all(Array.from(pastYears, period => fetch(`https://data.jsdelivr.com/v1/stats/packages/npm/${name}?period=${period}`).then(response => response.json()))).then((results) => {
    const totalDownloads = results.reduce((acc, data) => acc + data.hits.total, 0)
    console.log(`Total jsdelivr downloads: ${totalDownloads}`)
    return totalDownloads
  })
}

export default () => Promise.all([npm(), jsdelivr()]).then(([npm, jsdelivr]) => ({
  npm,
  jsdelivr,
  unpkg: 'unknown',
}))
