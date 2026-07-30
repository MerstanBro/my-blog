const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function likesPath(slug) {
  return `likes/${slug}.json`;
}

export function isValidDeviceId(deviceId) {
  return typeof deviceId === "string" && UUID_RE.test(deviceId.trim());
}

export function isValidSlug(slug) {
  const value = String(slug || "").trim();
  return value.length > 0 && value.length <= 160 && !/[\\/]/.test(value);
}

export function emptyLikes(slug) {
  return { slug, count: 0, devices: [] };
}

export function parseLikesFile(raw, slug) {
  if (!raw) return emptyLikes(slug);
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyLikes(slug);
    const devices = Array.isArray(data.devices)
      ? data.devices.map(String).filter(Boolean)
      : [];
    return {
      slug: String(data.slug || slug),
      count: Number.isFinite(data.count) ? Number(data.count) : devices.length,
      devices,
    };
  } catch {
    return emptyLikes(slug);
  }
}

export async function getLikeStatus(gitlab, slug, deviceId) {
  if (!isValidSlug(slug)) {
    const error = new Error("Invalid slug");
    error.status = 400;
    throw error;
  }
  if (deviceId && !isValidDeviceId(deviceId)) {
    const error = new Error("Invalid deviceId");
    error.status = 400;
    throw error;
  }

  let raw = null;
  try {
    ({ content: raw } = await gitlab.getRaw(likesPath(slug)));
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const data = parseLikesFile(raw, slug);
  return {
    count: data.devices.length,
    liked: deviceId ? data.devices.includes(deviceId.trim()) : false,
  };
}

export async function addLike(gitlab, slug, deviceId, { refreshReview } = {}) {
  if (!isValidSlug(slug)) {
    const error = new Error("Invalid slug");
    error.status = 400;
    throw error;
  }
  if (!isValidDeviceId(deviceId)) {
    const error = new Error("Invalid deviceId");
    error.status = 400;
    throw error;
  }

  const trimmedSlug = slug.trim();
  const trimmedDevice = deviceId.trim();
  const path = likesPath(trimmedSlug);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let raw = null;
    let lastCommitId = "";
    try {
      ({ content: raw, lastCommitId } = await gitlab.getRaw(path));
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    const data = parseLikesFile(raw, trimmedSlug);
    if (data.devices.includes(trimmedDevice)) {
      const error = new Error("already_liked");
      error.status = 409;
      error.code = "already_liked";
      error.count = data.devices.length;
      throw error;
    }

    data.devices.push(trimmedDevice);
    data.count = data.devices.length;
    data.slug = trimmedSlug;

    try {
      await gitlab.writeFile(path, `${JSON.stringify(data, null, 2)}\n`, {
        message: `like ${trimmedSlug}`,
        skipRebuild: true,
        lastCommitId,
      });
      if (typeof refreshReview === "function") {
        await refreshReview(gitlab);
      }
      return { count: data.count, liked: true };
    } catch (error) {
      if (error.status === 400 || error.status === 409) continue;
      throw error;
    }
  }

  const error = new Error("Could not save like");
  error.status = 503;
  throw error;
}
