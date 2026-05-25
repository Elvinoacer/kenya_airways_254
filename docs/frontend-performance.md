# Frontend Performance Guidelines

This file collects practical patterns and lightweight helpers added to the repo to improve frontend performance.

Key patterns

- Route-level code splitting: use `next/dynamic` or inline `dynamic()` to lazy-load large client components. See `app/ui/LazyClient.tsx`.
- Lazy loading: prefer `next/dynamic` with `ssr:false` for heavy client-only modules.
- Image optimization: use `next/image` with appropriate `sizes`/`priority`/`decoding` flags. See `app/ui/ImageOptimized.tsx`.
- React memoization: use `React.memo`, `useMemo`, and `useCallback` to avoid unnecessary renders on list items and expensive computations.
- Suspense boundaries: use `React.Suspense` wrappers where components perform lazy imports or data fetching in client islands.
- Streaming SSR: Next.js App Router supports streaming — keep heavy data fetches in client boundaries or use `revalidate` caching.
- Pagination & cursors: prefer cursor-based pagination for large datasets and avoid offset pagination for high offsets.
- Infinite scroll: use an intersection-observer hook — `app/ui/InfiniteScrollHook.tsx` — with server-side paged endpoints.
- Virtualized tables: use windowing to render only visible rows. `app/ui/VirtualizedList.tsx` provides a small implementation without external deps.

Local helpers added

- `app/ui/LazyClient.tsx` — dynamic import helper for client components.
- `app/ui/ImageOptimized.tsx` — next/image wrapper with defaults.
- `app/ui/InfiniteScrollHook.tsx` — intersection observer hook to trigger loading more data.
- `app/ui/VirtualizedList.tsx` — simple virtualized list rendering.

Recommended next steps

1. Replace list UIs with `VirtualizedList` where row heights are stable.
2. Add telemetry to measure LCP, FCP, TTFB and waterfall (Real User Monitoring).
3. Use `next/image` with proper loader and CDN for large images.
4. Add `react-window` or `react-virtual` for more complex virtualization needs.

Examples
Use `lazyClient()` to import a heavy client component:

```
const Chat = lazyClient(() => import('@/components/ChatClient'));
```

Use `VirtualizedList` for large tables:

```
<VirtualizedList items={rows} rowHeight={56} height={600} renderItem={(row) => <Row row={row} />} />
```
