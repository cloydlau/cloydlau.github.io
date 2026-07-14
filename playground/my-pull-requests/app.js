const USERNAME = 'cloydlau'
const CACHE_KEY = `recent-pull-requests:${USERNAME}:v4`
const CACHE_TTL = 60 * 60 * 1000

const elements = {
  avatar: document.querySelector('#avatar'),
  list: document.querySelector('#pull-requests'),
  name: document.querySelector('#profile-name'),
  resultCount: document.querySelector('#result-count'),
  status: document.querySelector('#status'),
  template: document.querySelector('#pull-request-template'),
  themeToggle: document.querySelector('#theme-toggle'),
}

let pullRequests = []

function getPreferredTheme() {
  const savedTheme = localStorage.getItem('pull-requests-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('pull-requests-theme', theme)
  elements.themeToggle.setAttribute(
    'aria-label',
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
  )
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return cached?.items?.length ? cached : null
  }
  catch {
    return null
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cachedAt: Date.now() }))
  }
  catch {
    // The page still works when storage is unavailable.
  }
}

async function fetchGitHubData() {
  const response = await fetch('./data.json', { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`Data file returned ${response.status}.`)
  }
  return response.json()
}

function getRepository(item) {
  const [owner, name] = item.repository_url.split('/').slice(-2)
  return { owner, name, fullName: `${owner}/${name}` }
}

function getState(item) {
  if (item.merged) {
    return 'merged'
  }
  if (item.draft) {
    return 'draft'
  }
  return item.state === 'open' ? 'open' : 'closed'
}

function formatRelativeDate(value) {
  const date = new Date(value)
  // This is elapsed-time conversion, not a financial calculation.
  // eslint-disable-next-line financial/no-division
  const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const intervals = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  for (const [unit, seconds] of intervals) {
    if (Math.abs(elapsedSeconds) >= seconds) {
      // eslint-disable-next-line financial/no-division
      const amount = Math.round(elapsedSeconds / seconds)
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        amount,
        unit,
      )
    }
  }

  return 'just now'
}

function renderProfile(user) {
  const displayName = user.name || user.login || USERNAME
  elements.name.textContent = displayName
  elements.name.href = user.html_url || `https://github.com/${USERNAME}`
  elements.avatar.src = user.avatar_url || `https://github.com/${USERNAME}.png?size=160`
  elements.avatar.alt = displayName
  document.title = `${displayName} is Contributing`
}

function createPullRequest(item) {
  const repository = getRepository(item)
  const repositoryUrl = `https://github.com/${repository.fullName}`
  const state = getState(item)
  const fragment = elements.template.content.cloneNode(true)
  const article = fragment.querySelector('.pull-request')
  const avatarLink = fragment.querySelector('.repo-avatar-link')
  const avatar = fragment.querySelector('.repo-avatar')
  const title = fragment.querySelector('.pull-request-title')
  const titleText = title.querySelector('span')
  const icon = fragment.querySelector('.state-icon')
  const repositoryName = fragment.querySelector('.repo-name')
  const stars = fragment.querySelector('.repo-stars span')
  const starsContainer = fragment.querySelector('.repo-stars')
  const number = fragment.querySelector('.pull-request-number')
  const time = fragment.querySelector('time')

  article.dataset.state = state
  avatarLink.href = repositoryUrl
  avatar.src = `https://github.com/${repository.owner}.png?size=96`
  avatar.alt = `${repository.owner} avatar`
  title.href = item.html_url
  title.setAttribute('aria-label', `${state} pull request: ${item.title}`)
  titleText.textContent = item.title
  icon.classList.add(`state-${state}`)
  icon.querySelector('use').setAttribute('href', `#icon-${state}`)
  repositoryName.href = repositoryUrl
  repositoryName.textContent = repository.fullName
  stars.textContent = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(item.stars)
  starsContainer.title = `${item.stars.toLocaleString()} GitHub stars`
  number.href = item.html_url
  number.textContent = `#${item.number}`
  time.dateTime = item.created_at
  time.title = new Date(item.created_at).toLocaleString()
  time.textContent = formatRelativeDate(item.created_at)

  return fragment
}

function renderPullRequests() {
  const visibleItems = pullRequests
    .filter(item => item.merged)
    .sort((first, second) => {
      const starDifference = second.stars - first.stars
      return starDifference || new Date(second.created_at) - new Date(first.created_at)
    })
  const fragment = document.createDocumentFragment()

  visibleItems.forEach(item => fragment.append(createPullRequest(item)))
  elements.list.replaceChildren(fragment)
  elements.resultCount.textContent = `${visibleItems.length} pull request${visibleItems.length === 1 ? '' : 's'}`

  if (visibleItems.length === 0) {
    elements.status.hidden = false
    elements.status.textContent = 'No pull requests found.'
  }
  else {
    elements.status.hidden = true
  }
}

function showError(error, hasCachedData) {
  if (hasCachedData) {
    elements.resultCount.textContent += ' · cached'
    return
  }

  elements.status.classList.add('error')
  elements.status.replaceChildren()
  const message = document.createElement('span')
  message.textContent = `Could not load pull requests. ${error.message}`
  const link = document.createElement('a')
  link.href = `https://github.com/pulls?q=is%3Apr+is%3Amerged+author%3A${USERNAME}`
  link.target = '_blank'
  link.rel = 'noreferrer'
  link.textContent = 'View them directly on GitHub'
  elements.status.append(message, link)
}

async function init() {
  setTheme(getPreferredTheme())
  const cached = readCache()

  if (cached) {
    renderProfile(cached.user)
    pullRequests = cached.items
    renderPullRequests()
  }

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return
  }

  try {
    const data = await fetchGitHubData()
    writeCache(data)
    renderProfile(data.user)
    pullRequests = data.items
    renderPullRequests()
  }
  catch (error) {
    showError(error, Boolean(cached))
  }
}

elements.themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
})

init()
