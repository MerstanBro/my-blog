# Blog Post Loading Behavior

## Understanding the Loading State

### When You'll See `loading.tsx`

The loading state will appear in these scenarios:

1. **First visit to a blog post** (not yet cached)
2. **After cache expires** (1 hour revalidation period)
3. **During development** with cache disabled
4. **Client-side navigation** to uncached posts

### When You Won't See It

- **Cached pages** (after first visit, within 1 hour)
- **Prefetched pages** (when hovering over links)
- **Static pages** (if pre-generated at build time)

---

## Testing Loading States

### Option 1: Disable Cache (Development)
```typescript
// In page.tsx, temporarily change:
export const revalidate = 0; // Disable cache
```

### Option 2: Hard Refresh
- Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
- This bypasses browser cache

### Option 3: Use Incognito/Private Mode
- Open in incognito to see fresh, uncached behavior

---

## Production Behavior

In production, the loading state provides a great UX for:
- **First-time visitors** - Smooth loading experience
- **New posts** - Not yet cached at edge
- **Cache revalidation** - After 1 hour expiry

Most users will experience **instant loads** due to edge caching, which is the desired behavior! ⚡

---

## Forcing Dynamic Behavior (If Needed)

If you want to always show loading states (not recommended for production):

```typescript
export const revalidate = 0; // No caching
export const dynamic = 'force-dynamic'; // Always dynamic
```

**Warning:** This will significantly slow down your site and increase costs.


