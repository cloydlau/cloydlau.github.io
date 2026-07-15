import { writeFile } from 'node:fs/promises'
import process from 'node:process'

const USERNAME = 'cloydlau'
const OUTPUT_URL = new URL('./data.json', import.meta.url)
const query = `
  query PullRequests($login: String!, $search: String!) {
    user(login: $login) {
      login
      name
      avatarUrl
      url
    }
    search(query: $search, type: ISSUE, first: 50) {
      nodes {
        ... on PullRequest {
          title
          url
          number
          createdAt
          state
          isDraft
          merged
          repository {
            nameWithOwner
            stargazerCount
          }
        }
      }
    }
  }
`

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'cloydlau.github.io',
    },
    body: JSON.stringify({
      query,
      variables: {
        login: USERNAME,
        search: `is:pr is:merged author:${USERNAME} is:public sort:created-desc`,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub GraphQL returned ${response.status}: ${await response.text()}`)
  }

  const result = await response.json()
  if (result.errors?.length) {
    throw new Error(result.errors.map(error => error.message).join('; '))
  }

  const user = result.data.user
  const data = {
    generatedAt: new Date().toISOString(),
    user: {
      login: user.login,
      name: user.name,
      avatar_url: user.avatarUrl,
      html_url: user.url,
    },
    items: result.data.search.nodes.map(pullRequest => ({
      title: pullRequest.title,
      html_url: pullRequest.url,
      number: pullRequest.number,
      created_at: pullRequest.createdAt,
      state: pullRequest.state.toLowerCase(),
      draft: pullRequest.isDraft,
      merged: pullRequest.merged,
      repository_url: `https://api.github.com/repos/${pullRequest.repository.nameWithOwner}`,
      stars: pullRequest.repository.stargazerCount,
    })),
  }

  await writeFile(OUTPUT_URL, `${JSON.stringify(data, null, 2)}\n`)
  console.info(`Wrote ${data.items.length} pull requests to ${OUTPUT_URL.pathname}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
