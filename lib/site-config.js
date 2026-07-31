export const site = {
  name: "Anas Al-Merstani",
  role: "Developer",
  description:
    "Thoughtful notes on development, technology, philosophy, and building useful things.",
};

export const demo = {
  content: {
    HERO_SECTION: {
      title: "Anas Al-Merstani",
      subtitle: "Developer and builder.",
      info: "I build focused web products and share what I learn along the way.",
    },
    CTA_SECTION: {
      title: "Notes from the workbench",
      description: "Practical writing about code, systems, and the craft of shipping.",
      buttonText: "Read the blog",
    },
    projects: [
      {
        id: "1",
        title: "A focused web project",
        description: "A clean, useful product designed around speed and clarity.",
        link: "https://gitlab.com/batMerstan",
        image: "",
      },
    ],
    SOCIAL_LINKS: [
      {
        name: "GitLab",
        href: "https://gitlab.com/batMerstan",
        icon: "Gitlab",
      },
      {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/anas-merstani-261ba81ab/",
        icon: "Linkedin",
      },
    ],
    leaderboardEntries: {
      entries: [
        { rank: 1, Name: "Anas", WPM: 77, Date: "Today" },
        { rank: 2, Name: "You?", WPM: 70, Date: "Next" },
      ],
    },
  },
  details: {
    number_of_pages: 1,
    tags: [
      { name: "JavaScript", number_of_pages: 1 },
      { name: "Engineering", number_of_pages: 1 },
    ],
  },
  blogs: [
    {
      title: "Building a fast static blog",
      path: "Building a fast static blog",
      description: "Why simple HTML, CSS, and JavaScript can be the right stack.",
      image: "",
      tags: ["JavaScript", "Engineering"],
      date: "2026-07-31",
    },
  ],
  posts: {
    "Building a fast static blog": `---
title: Building a fast static blog
description: Why simple HTML, CSS, and JavaScript can be the right stack.
date: 2026-07-31
image: ""
tags:
  - JavaScript
  - Engineering
---

Static sites are hard to beat when the content can be prepared ahead of time.

## The useful split

- Render articles during the build.
- Ship only the JavaScript that creates real interaction.
- Keep content editing separate from presentation.

\`\`\`js
const fast = "less runtime work";
console.log(fast);
\`\`\`

\`\`\`mermaid
flowchart LR
  Content[Content] --> Build[build.mjs] --> Dist[dist]
\`\`\`

\`\`\`chart
{"type":"bar","data":{"labels":["HTML","CSS","JS"],"datasets":[{"label":"Files","data":[12,1,3]}]}}
\`\`\`

The result is fast by default, easy to cache, and friendly to search engines.
`,
  },
  approvedComments: {
    "Building-a-fast-static-blog": [
      {
        id: "demo-1",
        postSlug: "Building-a-fast-static-blog",
        author: "Reader",
        body: "Clear and useful. Looking forward to v2.",
        createdAt: "2026-07-31T00:00:00.000Z",
      },
    ],
  },
  manifest: { version: 1, full: true, posts: [], commentPages: [], indexes: false },
};
