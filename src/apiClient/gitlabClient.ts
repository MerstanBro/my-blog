// src/apiClient/gitlabClient.ts
const GITLAB_TOKEN = process.env.NEXT_PUBLIC_GITLAB_TOKEN;
const GITLAB_API_BASE = 'https://gitlab.com/api/v4';

/**
 * Makes a GET request to the GitLab API with caching.
 * @param endpoint The API endpoint (e.g., 'projects/123/repository/files/path/to/file.txt/raw?ref=main')
 * @returns The parsed JSON response.
 */
export async function getGitLabData(endpoint: string) {
  try {
    const response = await fetch(`${GITLAB_API_BASE}/${endpoint}`, {
      headers: {
        "PRIVATE-TOKEN": `${GITLAB_TOKEN}`,
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch from GitLab: ${endpoint}`, error);
    throw error;
  }
}
