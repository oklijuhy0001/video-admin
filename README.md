# video-admin

Hệ thống quản lý và phát video qua GitHub + Cloudflare Pages.

## Structure

```
video-admin/
├── admin/          # SOURCE 1: Hono API + Vue 3 Admin UI
└── public/         # SOURCE 2: Hono API + Vue 3 Public Feed
```

## Deploy

| Service | Type | Root dir |
|---|---|---|
| `video-admin` | Render Web Service | `admin/` |
| `video-public-web` | Render Web Service | `public/` |

Xem `zplan.md` để biết chi tiết.
