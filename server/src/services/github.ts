import { Octokit } from '@octokit/rest'

const getOctokit = () =>
  new Octokit({ auth: process.env.GITHUB_TOKEN })

const owner = () => process.env.GITHUB_USERNAME || ''

export const createRepo = async (name: string): Promise<{ html_url: string }> => {
  const octokit = getOctokit()
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    private: false,
    auto_init: false,
    description: 'Video storage repository',
  })
  return { html_url: data.html_url }
}

export const initRepo = async (repo: string): Promise<void> => {
  const octokit = getOctokit()
  await octokit.repos.createOrUpdateFileContents({
    owner: owner(),
    repo,
    path: 'README.md',
    message: 'init',
    content: Buffer.from(`# ${repo}\nVideo storage`).toString('base64'),
    branch: 'dev',
  })
}

export const ensureDevBranch = async (repo: string): Promise<void> => {
  const octokit = getOctokit()
  try {
    await octokit.repos.getBranch({ owner: owner(), repo, branch: 'dev' })
  } catch {
    const { data: mainBranch } = await octokit.repos.getBranch({
      owner: owner(),
      repo,
      branch: 'main',
    })
    await octokit.git.createRef({
      owner: owner(),
      repo,
      ref: 'refs/heads/dev',
      sha: mainBranch.commit.sha,
    })
  }
}

export const pushFile = async (
  repo: string,
  filename: string,
  buffer: Buffer
): Promise<void> => {
  const octokit = getOctokit()
  const content = buffer.toString('base64')

  // Check if file exists on dev branch (to get sha for update)
  let sha: string | undefined
  try {
    const { data } = await octokit.repos.getContent({
      owner: owner(),
      repo,
      path: filename,
      ref: 'dev',
    })
    if (!Array.isArray(data) && 'sha' in data) sha = data.sha
  } catch {
    // File does not exist, that's fine
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: owner(),
    repo,
    path: filename,
    message: `add ${filename}`,
    content,
    branch: 'dev',
    ...(sha ? { sha } : {}),
  })
}

export const resolveFilename = async (repo: string, originalName: string): Promise<string> => {
  const octokit = getOctokit()
  try {
    await octokit.repos.getContent({ owner: owner(), repo, path: originalName, ref: 'dev' })
    // File exists — prefix with timestamp
    const ext = originalName.includes('.') ? '.' + originalName.split('.').pop() : ''
    const base = originalName.includes('.')
      ? originalName.slice(0, originalName.lastIndexOf('.'))
      : originalName
    return `${Date.now()}_${base}${ext}`
  } catch {
    return originalName
  }
}
