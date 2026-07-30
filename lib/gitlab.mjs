const SKIP_REBUILD = "[skip rebuild]";

export function gitlabConfig(env = process.env) {
  const projectId = env.GITLAB_PROJECT_ID || env.NEXT_PUBLIC_GITLAB_PROJECT_ID;
  const token = env.GITLAB_TOKEN || env.NEXT_PUBLIC_GITLAB_TOKEN;
  const ref = env.GITLAB_REF || "main";
  return { projectId, token, ref };
}

export function createMemoryGitlab(initial = {}) {
  const files = new Map(Object.entries(initial));
  let commits = 0;

  return {
    files,
    async listFiles(pathPrefix = "") {
      const prefix = pathPrefix ? `${pathPrefix.replace(/\/$/, "")}/` : "";
      return [...files.keys()].filter((key) => (prefix ? key.startsWith(prefix) : true));
    },
    async getRaw(filePath) {
      if (!files.has(filePath)) {
        const error = new Error(`Missing ${filePath}`);
        error.status = 404;
        throw error;
      }
      return { content: files.get(filePath), lastCommitId: `mem-${commits}` };
    },
    async writeFile(filePath, content, { message = "update", skipRebuild = true } = {}) {
      commits += 1;
      files.set(filePath, content);
      return {
        filePath,
        message: skipRebuild && !message.includes(SKIP_REBUILD) ? `${message} ${SKIP_REBUILD}` : message,
      };
    },
    async deleteFile(filePath, { message = "delete", skipRebuild = true } = {}) {
      if (!files.has(filePath)) {
        const error = new Error(`Missing ${filePath}`);
        error.status = 404;
        throw error;
      }
      files.delete(filePath);
      return {
        filePath,
        message: skipRebuild && !message.includes(SKIP_REBUILD) ? `${message} ${SKIP_REBUILD}` : message,
      };
    },
  };
}

export function createGitlabClient({ projectId, token, ref = "main", fetchImpl = fetch } = {}) {
  if (!projectId || !token) {
    throw new Error("GITLAB_PROJECT_ID and GITLAB_TOKEN are required");
  }

  const base =
    `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}` +
    `/repository/files`;

  async function getFileMeta(filePath) {
    const url = `${base}/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`;
    const response = await fetchImpl(url, { headers: { "PRIVATE-TOKEN": token } });
    if (response.status === 404) {
      const error = new Error(`Missing ${filePath}`);
      error.status = 404;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(`GitLab ${response.status}: failed to read ${filePath}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async function listTree(pathPrefix = "", page = 1, acc = []) {
    const url =
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}` +
      `/repository/tree?ref=${encodeURIComponent(ref)}` +
      `&path=${encodeURIComponent(pathPrefix)}&per_page=100&page=${page}`;
    const response = await fetchImpl(url, { headers: { "PRIVATE-TOKEN": token } });
    if (!response.ok) {
      if (response.status === 404) return acc;
      const error = new Error(`GitLab ${response.status}: failed to list ${pathPrefix}`);
      error.status = response.status;
      throw error;
    }
    const items = await response.json();
    acc.push(...items);
    if (items.length === 100) return listTree(pathPrefix, page + 1, acc);
    return acc;
  }

  return {
    async listFiles(pathPrefix = "") {
      const items = await listTree(pathPrefix);
      return items.filter((item) => item.type === "blob").map((item) => item.path);
    },

    async getRaw(filePath) {
      const url = `${base}/${encodeURIComponent(filePath)}/raw?ref=${encodeURIComponent(ref)}`;
      const response = await fetchImpl(url, { headers: { "PRIVATE-TOKEN": token } });
      if (response.status === 404) {
        const error = new Error(`Missing ${filePath}`);
        error.status = 404;
        throw error;
      }
      if (!response.ok) {
        const error = new Error(`GitLab ${response.status}: failed to fetch ${filePath}`);
        error.status = response.status;
        throw error;
      }
      let lastCommitId = "";
      try {
        const meta = await getFileMeta(filePath);
        lastCommitId = meta.last_commit_id || meta.commit_id || "";
      } catch {
        // Raw content is enough when metadata is unavailable.
      }
      return { content: await response.text(), lastCommitId };
    },

    async writeFile(filePath, content, { message = "update", skipRebuild = true, lastCommitId } = {}) {
      const finalMessage =
        skipRebuild && !message.includes(SKIP_REBUILD) ? `${message} ${SKIP_REBUILD}` : message;
      let existing = null;
      try {
        existing = await getFileMeta(filePath);
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      const body = {
        branch: ref,
        content,
        commit_message: finalMessage,
        encoding: "text",
      };
      if (existing) {
        body.last_commit_id = lastCommitId || existing.last_commit_id || existing.commit_id;
      }

      const url = `${base}/${encodeURIComponent(filePath)}`;
      const response = await fetchImpl(url, {
        method: existing ? "PUT" : "POST",
        headers: {
          "PRIVATE-TOKEN": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text();
        const error = new Error(`GitLab ${response.status}: failed to write ${filePath}: ${detail}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    },

    async deleteFile(filePath, { message = "delete", skipRebuild = true } = {}) {
      const finalMessage =
        skipRebuild && !message.includes(SKIP_REBUILD) ? `${message} ${SKIP_REBUILD}` : message;
      const url = `${base}/${encodeURIComponent(filePath)}`;
      const response = await fetchImpl(url, {
        method: "DELETE",
        headers: {
          "PRIVATE-TOKEN": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: ref,
          commit_message: finalMessage,
        }),
      });
      if (response.status === 404) {
        const error = new Error(`Missing ${filePath}`);
        error.status = 404;
        throw error;
      }
      if (!response.ok) {
        const detail = await response.text();
        const error = new Error(`GitLab ${response.status}: failed to delete ${filePath}: ${detail}`);
        error.status = response.status;
        throw error;
      }
      return true;
    },
  };
}

export { SKIP_REBUILD };
