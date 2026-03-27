const CF_API = 'https://api.cloudflare.com/client/v4'

const headers = () => ({
  'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
  'Content-Type': 'application/json',
})

const accountId = () => process.env.CF_ACCOUNT_ID || ''
const githubUser = () => process.env.GITHUB_USERNAME || ''

export const createPagesProject = async (
  projectName: string,
  repoName: string
): Promise<{ subdomain: string }> => {
  const res = await fetch(
    `${CF_API}/accounts/${accountId()}/pages/projects`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: projectName,
        production_branch: 'main',
        source: {
          type: 'github',
          config: {
            owner: githubUser(),
            repo_name: repoName,
            production_branch: 'main',
            pr_comments_enabled: false,
            deployments_enabled: true,
          },
        },
        build_config: {
          build_command: '',
          destination_dir: '/',
          root_dir: '/',
        },
      }),
    }
  )

  const data = await res.json() as { result?: { subdomain?: string }; errors?: unknown[] }

  if (!res.ok || data.errors?.length) {
    throw new Error(`Cloudflare createPagesProject failed: ${JSON.stringify(data)}`)
  }

  const subdomain = data.result?.subdomain || `${projectName}.pages.dev`
  return { subdomain }
}

export const triggerDeploy = async (projectName: string): Promise<void> => {
  const res = await fetch(
    `${CF_API}/accounts/${accountId()}/pages/projects/${projectName}/deployments`,
    { method: 'POST', headers: headers() }
  )
  if (!res.ok) {
    const text = await res.text()
    console.warn(`⚠️ triggerDeploy warning: ${text}`)
  }
}
