// src/services/gitlabService.ts

import { getGitLabData } from "@/apiClient/gitlabClient";
const GITLAB_PROJECT_ID = process.env.NEXT_PUBLIC_GITLAB_PROJECT_ID;
type tagDetails = {
    "name": string,
    "number_of_pages": number
}
export type BlogDetails = {
    number_of_pages: number,
    "tags": tagDetails[]
}
type NavLink = {
    name: string;
    href: string;
};

type HeroSection = {
    title: string;
    subtitle: string;
    info: string;
};

type Experience = {
    company: string;
    duration: string;
    start_date: string;
    end_date: string;
    job_title: string;
    description: string;
    company_img: string;
};

type SocialLink = {
    name: string;
    href: string;
    icon: string;
};

type Project = {
    id: string;
    title: string;
    description: string;
    link: string;
    image: string;
};

type LeaderboardEntry = {
    rank: number;
    WPM: number;
    Name: string;
    Date: string;
};

export type BlogContent = {
    NAV_LINKS: NavLink[];
    HERO_SECTION: HeroSection;
    experiences: Experience[];
    SOCIAL_LINKS: SocialLink[];
    projects: Project[];
    leaderboardEntries: {
        entries: LeaderboardEntry[];
    };

}
type blog = {
    title: string,
    description: string
    image: string,
    tags: string[],
    path: string,
    date: string,
}
export type Page = {
    blogs: blog[]
}

/**
 * Example function to fetch file content from a specific GitLab project.
 * @param filePath The file path (URL-encoded) in the repository.
 * @param ref The branch or commit ref (default is "main").
 * @returns The file content.
 */

export async function fetchGitLabFileContent(filePath: string): Promise<string> {
    const endpoint = `projects/${GITLAB_PROJECT_ID}/repository/files/${encodeURIComponent(filePath)}/raw?ref=main`;
    return getGitLabData(endpoint);
}

export async function fetchBlog(filePath: string): Promise<string> {
    const file = await fetchGitLabFileContent(filePath)
    return file
}

export async function fetchDetails(): Promise<BlogDetails> {
    const file = await fetchGitLabFileContent("details.json")
    return JSON.parse(file);
}
export async function fetchContent(): Promise<BlogContent> {
    const file = await fetchGitLabFileContent("content.json")
    return JSON.parse(file);
}
export async function fetchPage(number: number, tag: string | null): Promise<Page> {
    const path = tag ? `tags/${tag}/${number}.json` : `pages/${number}.json`
    const file = await fetchGitLabFileContent(path)
    return JSON.parse(file);
}