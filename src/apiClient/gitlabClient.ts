// src/apiClient/gitlabClient.ts
const GITLAB_TOKEN = process.env.NEXT_PUBLIC_GITLAB_TOKEN;
/**
 * Makes a GET request to the GitLab API.
 * @param endpoint The API endpoint (e.g., 'projects/123/repository/files/path/to/file.txt/raw?ref=main')
 * @returns The parsed JSON response.
 */
export async function getGitLabData(endpoint: string) {
  console.log(`https://gitlab.com/api/v4/${endpoint}`)
  const response = await fetch(`https://gitlab.com/api/v4/${endpoint}`, {
    headers: {
      "PRIVATE-TOKEN": `${GITLAB_TOKEN}`,
    },
  });
  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }
  return await response.text();
}
