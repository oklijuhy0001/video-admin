# zplan.md — Kế hoạch hệ thống Admin Quản lý Video

---

## 1. Tổng quan hệ thống

Hệ thống gồm **2 source độc lập**, deploy thành **2 services trên Render free tier**:

| Service | Type | Source | Mô tả |
|---|---|---|---|
| `video-admin` | Render Web Service | `admin/` | Hono API + serve Vue 3 SPA |
| `video-public-web` | Render Web Service | `public/` | Hono API + serve Vue 3 SPA + meta inject + pre-render |

Cả 2 services kết nối cùng **1 Aiven PostgreSQL**.  
Cả 2 cùng stack: **Hono + Vue 3** — đồng nhất, dễ maintain.

---

## 2. Stack công nghệ

| Thành phần | Admin | Public |
|---|---|---|
| Backend | **Hono** (Node/TS) | **Hono** (Node/TS) |
| Frontend | **Vue 3** + Vite | **Vue 3** + Vite |
| CSS | Vanilla CSS | Vanilla CSS |
| SEO | Không cần | Hono meta inject + pre-render tĩnh |
| Database | **Aiven PostgreSQL** (chung) | **Aiven PostgreSQL** (chung) |
| GitHub integration | `@octokit/rest` | — |
| Cloudflare integration | Fetch API | — |

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────┐
│              SOURCE 1: admin/                            │
│                                                          │
│  [video-admin — Render Web Service]                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Hono                                           │    │
│  │  ├── /health                                    │    │
│  │  ├── /api/*        REST API                     │    │
│  │  └── /*            serveStatic → Vue 3 dist/    │    │
│  └─────────────────────────────────────────────────┘    │
│          ├─► GitHub API                                  │
│          ├─► Cloudflare API                              │
│          └─► Aiven PostgreSQL ◄──────────────────────┐  │
└──────────────────────────────────────────────────────│──┘
                                                       │
┌──────────────────────────────────────────────────────│──┐
│              SOURCE 2: public/                        │  │
│                                                       │  │
│  [video-public-web — Render Web Service]              │  │
│  ┌─────────────────────────────────────────────────┐ │  │
│  │  Hono                                           │ │  │
│  │  ├── /health                                    │ │  │
│  │  ├── /api/*          REST API                   │ │  │
│  │  ├── /sitemap*.xml   Sitemaps                   │ │  │
│  │  ├── /v/:id-:slug    Meta inject → HTML shell   │ │  │
│  │  ├── /n/:name-slug   Serve pre-rendered HTML    │ │  │
│  │  └── /*              serveStatic → Vue 3 dist/  │ │  │
│  └─────────────────────────────────────────────────┘ │  │
│          └─────────────────────────────── Aiven PG ──┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Cấu trúc thư mục dự án

```
video-admin/
├── admin/
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── db.ts
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   ├── repos.ts
│   │   │   │   ├── videos.ts
│   │   │   │   └── upload.ts
│   │   │   ├── services/
│   │   │   │   ├── github.ts
│   │   │   │   └── cloudflare.ts
│   │   │   └── utils/
│   │   │       ├── naming.ts
│   │   │       └── validator.ts
│   │   ├── data/
│   │   │   └── *.txt
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/
│       ├── src/
│       │   ├── main.js
│       │   ├── App.vue
│       │   ├── api.js
│       │   ├── components/
│       │   │   ├── HealthTab.vue
│       │   │   ├── RepoTable.vue
│       │   │   ├── VideoTable.vue
│       │   │   └── UploadTab.vue
│       │   └── style.css
│       ├── index.html
│       └── package.json
│
└── public/
    ├── server/
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── db.ts
    │   │   ├── routes/
    │   │   │   ├── health.ts
    │   │   │   ├── videos.ts
    │   │   │   ├── video.ts
    │   │   │   ├── names.ts
    │   │   │   ├── nameVideos.ts
    │   │   │   └── sitemap.ts
    │   │   └── utils/
    │   │       ├── htmlBuilder.ts
    │   │       ├── slug.ts
    │   │       └── naming.ts
    │   ├── scripts/
    │   │   └── prerender.ts
    │   ├── data/
    │   │   └── *.txt
    │   ├── package.json
    │   └── tsconfig.json
    └── client/
        ├── src/
        │   ├── main.js
        │   ├── App.vue
        │   ├── api.js
        │   ├── composables/
        │   │   └── useVideoFeed.js
        │   ├── components/
        │   │   ├── VideoFeed.vue
        │   │   ├── VideoItem.vue
        │   │   └── NamePageLink.vue
        │   └── style.css
        ├── index.html
        └── package.json
```

---

## 5. Cấu trúc dữ liệu (PostgreSQL — Aiven)

```sql
CREATE TABLE repos (
  id           SERIAL PRIMARY KEY,
  repo_name    TEXT NOT NULL,
  cf_pages_url TEXT NOT NULL,
  video_count  INTEGER DEFAULT 0,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE videos (
  id         SERIAL PRIMARY KEY,
  cf_url     TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_name ON videos(name);
```

---

## 6. API Endpoints

### Admin (`video-admin`)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/repos` | Danh sách repos |
| GET | `/api/videos` | Danh sách video (`?page&limit&search`) |
| POST | `/api/upload` | Upload ≤ 10 file, ≤ 25MB/file |
| GET | `/*` | Serve Vue 3 SPA |

### Public (`video-public-web`)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/public/videos` | Feed (`?seed=&offset=&limit=`) |
| GET | `/api/public/videos/:id` | Chi tiết 1 video |
| GET | `/api/public/names` | Danh sách tên + số video |
| GET | `/api/public/names/:slug/videos` | Video theo tên |
| GET | `/v/:id-:slug` | HTML + meta inject (SEO) |
| GET | `/n/:name-slug` | Pre-rendered HTML (SEO) |
| GET | `/sitemap.xml` | Sitemap index |
| GET | `/sitemap-videos.xml` | Sitemap `/v/*` |
| GET | `/sitemap-names.xml` | Sitemap `/n/*` |
| GET | `/*` | Serve Vue 3 SPA |

---

## 7. Seed-based random + Infinite loop

```sql
-- Cùng seed → cùng thứ tự → pagination đúng
SELECT SETSEED(:seed);
SELECT id, cf_url, name, created_at
FROM videos ORDER BY RANDOM()
LIMIT :limit OFFSET :offset;
```

```
Mở app  → seed = (Date.now()/1000 % 2 - 1), offset = 0
Fetch   → gửi seed+offset, nhận videos+total, offset += limit
Hết     → seed mới, offset = 0 → loop lại vô hạn
```

---

## 8. SEO Strategy

- `/v/:id-:slug` — Hono query DB → inject `<title>`, `og:video`, Schema.org vào `<head>`
- `/n/:name-slug` — script prerender lúc build → HTML tĩnh, Hono serve static
- Feed `/` — SPA thuần, không cần SEO (nội dung random)
- Sitemap tách đôi: `sitemap-videos.xml` + `sitemap-names.xml`

---

## 9. Deploy

| Service | Build cmd | Start cmd |
|---|---|---|
| `video-admin` | `cd client && npm i && npm run build && cd ../server && npm i && npm run build` | `cd server && node dist/index.js` |
| `video-public-web` | `cd client && npm i && npm run build && cd ../server && npm i && npm run build && npx tsx scripts/prerender.ts` | `cd server && node dist/index.js` |

Keep-alive: cả 2 `App.vue` ping `/health` mỗi 14 phút.

---

## 10. Implementation Steps (AI Agent)

> Mỗi step là 1 task độc lập, nhỏ, có thể verify ngay sau khi hoàn thành.  
> Thực hiện **đúng thứ tự**. Không gộp step.

---

### PHASE 0 — Khởi tạo repo & cấu trúc thư mục

- [ ] **0.1** Tạo thư mục gốc `video-admin/`
- [ ] **0.2** Tạo `video-admin/.gitignore` — bao gồm `node_modules`, `dist`, `.env`, `dist-prerender`
- [ ] **0.3** Tạo `video-admin/README.md` — mô tả ngắn dự án
- [ ] **0.4** Tạo cấu trúc thư mục `admin/server/src/routes/`
- [ ] **0.5** Tạo cấu trúc thư mục `admin/server/src/services/`
- [ ] **0.6** Tạo cấu trúc thư mục `admin/server/src/utils/`
- [ ] **0.7** Tạo cấu trúc thư mục `admin/server/data/`
- [ ] **0.8** Tạo cấu trúc thư mục `admin/client/src/components/`
- [ ] **0.9** Tạo cấu trúc thư mục `public/server/src/routes/`
- [ ] **0.10** Tạo cấu trúc thư mục `public/server/src/utils/`
- [ ] **0.11** Tạo cấu trúc thư mục `public/server/scripts/`
- [ ] **0.12** Tạo cấu trúc thư mục `public/server/data/`
- [ ] **0.13** Tạo cấu trúc thư mục `public/client/src/components/`
- [ ] **0.14** Tạo cấu trúc thư mục `public/client/src/composables/`

---

### PHASE 1 — Database

- [ ] **1.1** Tạo PostgreSQL service trên Aiven, lấy connection URI
- [ ] **1.2** Lưu connection URI vào `admin/server/.env` dưới key `DATABASE_URL`
- [ ] **1.3** Lưu connection URI vào `public/server/.env` dưới key `DATABASE_URL`
- [ ] **1.4** Kết nối Aiven bằng client (psql hoặc DBeaver), chạy `CREATE TABLE repos (...)`
- [ ] **1.5** Chạy `CREATE TABLE videos (...)`
- [ ] **1.6** Chạy `CREATE INDEX idx_videos_name ON videos(name)`
- [ ] **1.7** Verify: chạy `\dt` → thấy `repos`, `videos`

---

### PHASE 2 — Admin Server (Hono)

#### 2.1 Setup project
- [ ] **2.1.1** Tạo `admin/server/package.json` — dependencies: `hono`, `@hono/node-server`, `pg`, `@octokit/rest`, `glob`, `dotenv`; devDependencies: `typescript`, `tsx`, `@types/node`, `@types/pg`
- [ ] **2.1.2** Tạo `admin/server/tsconfig.json` — target ES2020, module commonjs, outDir `dist`
- [ ] **2.1.3** Thêm scripts vào `package.json`: `build: tsc`, `dev: tsx src/index.ts`, `start: node dist/index.js`
- [ ] **2.1.4** Chạy `npm install` trong `admin/server/`

#### 2.2 Database connection
- [ ] **2.2.1** Tạo `admin/server/src/db.ts` — khởi tạo `pg.Pool` từ `process.env.DATABASE_URL`, `max: 5`, `ssl: { rejectUnauthorized: false }`
- [ ] **2.2.2** Export hàm `query(text, params)` wrapper cho `pool.query`
- [ ] **2.2.3** Verify: thêm log khi pool connect thành công

#### 2.3 Naming utility
- [ ] **2.3.1** Tạo `admin/server/data/names1.txt` — điền ít nhất 10 tên SEO mẫu, mỗi dòng 1 tên
- [ ] **2.3.2** Tạo `admin/server/src/utils/naming.ts` — hàm `loadNames()` dùng `glob` đọc `data/*.txt`, split theo `\n`, trim, filter rỗng, gộp thành 1 array
- [ ] **2.3.3** Export biến `names: string[]` và hàm `getName(totalVideos: number): string` trả `names[totalVideos % names.length]`
- [ ] **2.3.4** Verify: viết test nhỏ inline — `loadNames()` rồi log `getName(0)`, `getName(99)`, `getName(100)`

#### 2.4 Validator utility
- [ ] **2.4.1** Tạo `admin/server/src/utils/validator.ts`
- [ ] **2.4.2** Export `MAX_FILES = 10`, `MAX_SIZE_MB = 25`, `ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']`
- [ ] **2.4.3** Export hàm `validateFiles(files)` — trả `{ valid: File[], errors: {filename, error}[] }`
- [ ] **2.4.4** Validate: số file > MAX_FILES → error tổng
- [ ] **2.4.5** Validate từng file: size > 25MB → error; type không hợp lệ → error

#### 2.5 GitHub service
- [ ] **2.5.1** Tạo `admin/server/src/services/github.ts`
- [ ] **2.5.2** Khởi tạo Octokit từ `process.env.GITHUB_TOKEN`
- [ ] **2.5.3** Export hàm `createRepo(name: string)` — gọi `octokit.repos.createForAuthenticatedUser`, visibility `public`
- [ ] **2.5.4** Export hàm `initRepo(owner, repo)` — push file `README.md` để tạo commit đầu tiên (bắt buộc để Cloudflare bind được)
- [ ] **2.5.5** Export hàm `pushFile(owner, repo, filename, base64Content)` — gọi `octokit.repos.createOrUpdateFileContents`
- [ ] **2.5.6** Xử lý trùng tên file: nếu API trả 422 → thêm prefix `<Date.now()>_` rồi thử lại
- [ ] **2.5.7** Verify: test `createRepo` với tên `test-repo-temp`, sau đó xóa thủ công

#### 2.6 Cloudflare service
- [ ] **2.6.1** Tạo `admin/server/src/services/cloudflare.ts`
- [ ] **2.6.2** Export hàm `createPagesProject(name, githubOwner, repoName)` — POST `/accounts/{CF_ACCOUNT_ID}/pages/projects` với `source.type = "github"`, `build_config.build_command = ""`, `build_config.destination_dir = "/"`
- [ ] **2.6.3** Export hàm `triggerDeploy(projectName)` — POST `/accounts/{CF_ACCOUNT_ID}/pages/projects/{name}/deployments`
- [ ] **2.6.4** Verify: log response từ `createPagesProject` với project tên test

#### 2.7 Routes

##### Health
- [ ] **2.7.1** Tạo `admin/server/src/routes/health.ts`
- [ ] **2.7.2** `GET /health` — query `SELECT COUNT(*) FROM videos` và `SELECT COUNT(*) FROM repos`
- [ ] **2.7.3** Trả JSON: `{ status, service: "admin", total_videos, total_repos, db: "connected", timestamp }`
- [ ] **2.7.4** Bắt lỗi DB → trả `{ status: "error", db: "disconnected" }`

##### Repos
- [ ] **2.7.5** Tạo `admin/server/src/routes/repos.ts`
- [ ] **2.7.6** `GET /api/repos` — `SELECT * FROM repos ORDER BY created_at DESC`
- [ ] **2.7.7** Trả array repos với tất cả các cột

##### Videos
- [ ] **2.7.8** Tạo `admin/server/src/routes/videos.ts`
- [ ] **2.7.9** `GET /api/videos` — nhận query params `page` (default 1), `limit` (default 20), `search` (optional)
- [ ] **2.7.10** Nếu có `search`: `WHERE name ILIKE $1` với value `%search%`
- [ ] **2.7.11** Thêm `OFFSET` và `LIMIT`, trả `{ videos, total, page, limit }`

##### Upload
- [ ] **2.7.12** Tạo `admin/server/src/routes/upload.ts`
- [ ] **2.7.13** `POST /api/upload` — parse `multipart/form-data`, lấy array files từ field `files[]`
- [ ] **2.7.14** Gọi `validateFiles()` — nếu có lỗi tổng (>10 file) → return 400 ngay
- [ ] **2.7.15** Query repo active: `SELECT * FROM repos WHERE video_count < 1000 ORDER BY created_at DESC LIMIT 1`
- [ ] **2.7.16** Nếu không có repo active: gọi `createRepo()` → `initRepo()` → `createPagesProject()` → `INSERT INTO repos`
- [ ] **2.7.17** Loop từng file hợp lệ (tuần tự, dùng `for...of` không dùng `Promise.all`):
- [ ] **2.7.18** &nbsp;&nbsp;&nbsp;&nbsp;Query `SELECT COUNT(*) FROM videos` → tính `name = getName(count)`
- [ ] **2.7.19** &nbsp;&nbsp;&nbsp;&nbsp;Convert file buffer sang base64
- [ ] **2.7.20** &nbsp;&nbsp;&nbsp;&nbsp;Gọi `pushFile()` lên GitHub
- [ ] **2.7.21** &nbsp;&nbsp;&nbsp;&nbsp;Tính `cf_url = repo.cf_pages_url + '/' + filename`
- [ ] **2.7.22** &nbsp;&nbsp;&nbsp;&nbsp;`INSERT INTO videos (cf_url, name)`
- [ ] **2.7.23** &nbsp;&nbsp;&nbsp;&nbsp;`UPDATE repos SET video_count = video_count + 1 WHERE id = ?`
- [ ] **2.7.24** &nbsp;&nbsp;&nbsp;&nbsp;Kiểm tra nếu `video_count` đã đạt 1000 → tạo repo mới cho file tiếp theo
- [ ] **2.7.25** Gọi `triggerDeploy()` sau khi upload xong tất cả file
- [ ] **2.7.26** Trả `{ success: true, uploaded: [...], errors: [...] }`

#### 2.8 Entry point
- [ ] **2.8.1** Tạo `admin/server/src/index.ts`
- [ ] **2.8.2** Import `dotenv/config` ở dòng đầu tiên
- [ ] **2.8.3** Gọi `loadNames()` ngay sau dotenv
- [ ] **2.8.4** Khởi tạo Hono app
- [ ] **2.8.5** Mount route health trước tất cả
- [ ] **2.8.6** Mount các route `/api/*`
- [ ] **2.8.7** Thêm `serveStatic({ root: '../client/dist' })` cho `/*`
- [ ] **2.8.8** Thêm catch-all: `GET /*` → trả file `../client/dist/index.html` (SPA fallback)
- [ ] **2.8.9** Gọi `serve({ fetch: app.fetch, port: process.env.PORT || 3000 })`
- [ ] **2.8.10** Verify: `npm run dev` → curl `http://localhost:3000/health` trả JSON đúng

---

### PHASE 3 — Admin Client (Vue 3)

#### 3.1 Setup project
- [ ] **3.1.1** Tạo `admin/client/package.json` — dependencies: `vue`; devDependencies: `vite`, `@vitejs/plugin-vue`
- [ ] **3.1.2** Tạo `admin/client/vite.config.js` — plugin vue, build outDir `dist`
- [ ] **3.1.3** Tạo `admin/client/index.html` — `<div id="app">`, import `src/main.js`
- [ ] **3.1.4** Chạy `npm install` trong `admin/client/`

#### 3.2 API wrapper
- [ ] **3.2.1** Tạo `admin/client/src/api.js` — export `apiFetch(path, options)` gọi `fetch(path, options)` (same origin, không cần base URL)
- [ ] **3.2.2** Export các hàm: `getHealth()`, `getRepos()`, `getVideos(params)`, `uploadFiles(formData)`

#### 3.3 Style
- [ ] **3.3.1** Tạo `admin/client/src/style.css` — reset CSS cơ bản, layout flex/grid đơn giản, table style, button style, form style

#### 3.4 Components

##### HealthTab
- [ ] **3.4.1** Tạo `admin/client/src/components/HealthTab.vue`
- [ ] **3.4.2** Gọi `getHealth()` khi mount, hiển thị: status, service, total_videos, total_repos, db, timestamp
- [ ] **3.4.3** Nút "Refresh" gọi lại `getHealth()`
- [ ] **3.4.4** Hiển thị màu xanh nếu `status = ok`, đỏ nếu lỗi

##### RepoTable
- [ ] **3.4.5** Tạo `admin/client/src/components/RepoTable.vue`
- [ ] **3.4.6** Gọi `getRepos()` khi mount, hiển thị bảng: ID, repo_name, cf_pages_url (link), video_count/1000, created_at
- [ ] **3.4.7** Highlight row nếu `video_count >= 1000` (repo đầy)

##### VideoTable
- [ ] **3.4.8** Tạo `admin/client/src/components/VideoTable.vue`
- [ ] **3.4.9** Gọi `getVideos({ page: 1, limit: 20 })` khi mount
- [ ] **3.4.10** Hiển thị bảng: ID, name, cf_url (link), created_at
- [ ] **3.4.11** Thêm input search — debounce 300ms → gọi lại `getVideos({ search })`
- [ ] **3.4.12** Thêm pagination: nút Trước / Sau, hiển thị trang hiện tại / tổng trang

##### UploadTab
- [ ] **3.4.13** Tạo `admin/client/src/components/UploadTab.vue`
- [ ] **3.4.14** Input `type="file"` — `accept="video/*"`, `multiple`, tối đa 10 file
- [ ] **3.4.15** Validate client-side trước khi submit: số file > 10 → alert; file > 25MB → loại khỏi danh sách + hiển thị lỗi
- [ ] **3.4.16** Hiển thị danh sách file đã chọn: tên, size, trạng thái (chờ / đang upload / thành công / lỗi)
- [ ] **3.4.17** Nút "Upload" → tạo `FormData`, append từng file vào field `files[]`, gọi `uploadFiles(formData)`
- [ ] **3.4.18** Hiển thị kết quả: uploaded list + error list sau khi hoàn thành
- [ ] **3.4.19** Nút "Xóa hết" reset danh sách

#### 3.5 App root
- [ ] **3.5.1** Tạo `admin/client/src/main.js` — `createApp(App).mount('#app')`
- [ ] **3.5.2** Tạo `admin/client/src/App.vue` — tab navigation: Health / Repos / Videos / Upload
- [ ] **3.5.3** Dùng `ref` lưu tab hiện tại, `v-show` để switch component
- [ ] **3.5.4** Thêm `setInterval(() => fetch('/health'), 14 * 60 * 1000)` trong `onMounted` để keep-alive Render
- [ ] **3.5.5** Import `style.css` trong `main.js`
- [ ] **3.5.6** Verify: `npm run dev` trong `admin/client/` → thấy UI 4 tab hoạt động

#### 3.6 Build & integration test
- [ ] **3.6.1** Chạy `npm run build` trong `admin/client/` → sinh ra `dist/`
- [ ] **3.6.2** Chạy `npm run dev` trong `admin/server/`
- [ ] **3.6.3** Truy cập `http://localhost:3000` → thấy Vue admin UI
- [ ] **3.6.4** Tab Health → thấy data từ DB
- [ ] **3.6.5** Tab Upload → upload 1 file test nhỏ → verify record trong DB

---

### PHASE 4 — Public Server (Hono)

#### 4.1 Setup project
- [ ] **4.1.1** Tạo `public/server/package.json` — dependencies: `hono`, `@hono/node-server`, `pg`, `glob`, `dotenv`; devDependencies: `typescript`, `tsx`, `@types/node`, `@types/pg`
- [ ] **4.1.2** Tạo `public/server/tsconfig.json` — tương tự admin
- [ ] **4.1.3** Thêm scripts: `build`, `dev`, `start`, `prerender: tsx scripts/prerender.ts`
- [ ] **4.1.4** Chạy `npm install`

#### 4.2 Database connection
- [ ] **4.2.1** Tạo `public/server/src/db.ts` — tương tự admin, cùng `DATABASE_URL`, pool max 5

#### 4.3 Utilities

##### Slug
- [ ] **4.3.1** Tạo `public/server/src/utils/slug.ts`
- [ ] **4.3.2** Export hàm `toSlug(name: string)` — lowercase, bỏ dấu tiếng Việt, thay space bằng `-`, bỏ ký tự đặc biệt
- [ ] **4.3.3** Export hàm `slugToName(names: string[], slug: string)` — tìm tên trong array khớp với slug
- [ ] **4.3.4** Verify: `toSlug('Hướng dẫn nấu phở bò')` → `'huong-dan-nau-pho-bo'`

##### Naming
- [ ] **4.3.5** Tạo `public/server/src/utils/naming.ts` — copy y hệt `admin/server/src/utils/naming.ts`
- [ ] **4.3.6** Copy file txt từ `admin/server/data/` sang `public/server/data/` (hoặc symlink)

##### HTML Builder
- [ ] **4.3.7** Tạo `public/server/src/utils/htmlBuilder.ts`
- [ ] **4.3.8** Export hàm `buildShell({ title, metaTags, schemaJson })` — trả HTML string với `<head>` đầy đủ + `<div id="app">` + script import Vue bundle
- [ ] **4.3.9** Export hàm `buildVideoMeta(video)` — trả array meta tag string cho video page
- [ ] **4.3.10** Export hàm `buildNamePageHtml({ name, slug, count, siteUrl })` — trả HTML hoàn chỉnh trang danh mục (có H1, description, danh sách video placeholder, link canonical)

#### 4.4 Routes

##### Health
- [ ] **4.4.1** Tạo `public/server/src/routes/health.ts` — giống admin, `service: "public-web"`

##### Videos feed
- [ ] **4.4.2** Tạo `public/server/src/routes/videos.ts`
- [ ] **4.4.3** `GET /api/public/videos` — nhận `seed` (float), `offset` (int, default 0), `limit` (int, default 10)
- [ ] **4.4.4** Validate `seed` là float trong `[-1, 1]` — nếu không hợp lệ → random seed mới
- [ ] **4.4.5** Chạy `SELECT SETSEED($1)` với seed
- [ ] **4.4.6** Chạy `SELECT COUNT(*) FROM videos` → lấy `total`
- [ ] **4.4.7** Chạy `SELECT id, cf_url, name, created_at FROM videos ORDER BY RANDOM() LIMIT $1 OFFSET $2`
- [ ] **4.4.8** Map kết quả: thêm field `slug = toSlug(name)`
- [ ] **4.4.9** Trả `{ videos, total, seed, offset }`
- [ ] **4.4.10** `GET /api/public/videos/:id` — `SELECT * FROM videos WHERE id = $1`, thêm `slug`

##### Video page (meta inject)
- [ ] **4.4.11** Tạo `public/server/src/routes/video.ts`
- [ ] **4.4.12** `GET /v/:slug` — parse id từ slug: `slug.split('-')[0]`
- [ ] **4.4.13** `SELECT id, cf_url, name, created_at FROM videos WHERE id = $1`
- [ ] **4.4.14** Nếu không tìm thấy → redirect về `/`
- [ ] **4.4.15** Gọi `buildVideoMeta(video)` → gọi `buildShell({ title, metaTags, schemaJson })`
- [ ] **4.4.16** Trả HTML với `c.html(html)`

##### Names
- [ ] **4.4.17** Tạo `public/server/src/routes/names.ts`
- [ ] **4.4.18** `GET /api/public/names` — `SELECT name, COUNT(*) as count FROM videos GROUP BY name ORDER BY count DESC`
- [ ] **4.4.19** Map: thêm `slug = toSlug(name)`
- [ ] **4.4.20** Serve pre-rendered `/n/*`: `app.use('/n/*', serveStatic({ root: '../../dist-prerender' }))`
- [ ] **4.4.21** `GET /api/public/names/:slug/videos` — nhận `page`, `limit`
- [ ] **4.4.22** Tìm name từ slug: gọi `slugToName(names, slug)`
- [ ] **4.4.23** `SELECT * FROM videos WHERE name = $1 LIMIT $2 OFFSET $3`
- [ ] **4.4.24** Trả `{ videos, total, page, limit }`

##### Sitemap
- [ ] **4.4.25** Tạo `public/server/src/routes/sitemap.ts`
- [ ] **4.4.26** `GET /sitemap.xml` — trả XML sitemap index trỏ đến `/sitemap-videos.xml` và `/sitemap-names.xml`
- [ ] **4.4.27** `GET /sitemap-videos.xml` — query tất cả videos, generate `<url>` cho mỗi `/v/:id-:slug` kèm `<video:video>` tag
- [ ] **4.4.28** `GET /sitemap-names.xml` — lấy tên unique từ DB, generate `<url>` cho mỗi `/n/:slug`, priority `0.9`
- [ ] **4.4.29** Set header `Content-Type: application/xml` cho cả 3 route

#### 4.5 Pre-render script
- [ ] **4.5.1** Tạo `public/server/scripts/prerender.ts`
- [ ] **4.5.2** Import `dotenv/config`, `db`, `loadNames`, `toSlug`, `buildNamePageHtml`
- [ ] **4.5.3** Query `SELECT name, COUNT(*) FROM videos GROUP BY name`
- [ ] **4.5.4** Loop từng tên: tạo thư mục `dist-prerender/n/{slug}/`, ghi file `index.html`
- [ ] **4.5.5** Log số file đã generate
- [ ] **4.5.6** Verify: chạy `npm run prerender` → thấy thư mục `dist-prerender/n/` có file HTML

#### 4.6 Entry point
- [ ] **4.6.1** Tạo `public/server/src/index.ts`
- [ ] **4.6.2** Import `dotenv/config`, `loadNames`
- [ ] **4.6.3** Gọi `loadNames()` khi khởi động
- [ ] **4.6.4** Mount theo thứ tự: health → sitemap routes → `/api/*` → `/v/:slug` → `/n/*` (serveStatic) → `/*` (Vue SPA)
- [ ] **4.6.5** SPA fallback: mọi request không khớp → trả `../client/dist/index.html`
- [ ] **4.6.6** Verify: `npm run dev` → curl `/health` trả JSON đúng

---

### PHASE 5 — Public Client (Vue 3)

#### 5.1 Setup project
- [ ] **5.1.1** Tạo `public/client/package.json` — dependencies: `vue`; devDependencies: `vite`, `@vitejs/plugin-vue`
- [ ] **5.1.2** Tạo `public/client/vite.config.js`
- [ ] **5.1.3** Tạo `public/client/index.html`
- [ ] **5.1.4** Chạy `npm install`

#### 5.2 API wrapper
- [ ] **5.2.1** Tạo `public/client/src/api.js` — export `getVideos(seed, offset, limit)`, `getVideoById(id)`, `getNames()`, `getNameVideos(slug, page, limit)`

#### 5.3 Composable: useVideoFeed
- [ ] **5.3.1** Tạo `public/client/src/composables/useVideoFeed.js`
- [ ] **5.3.2** State: `videos = ref([])`, `seed = ref(newSeed())`, `offset = ref(0)`, `total = ref(Infinity)`, `loading = ref(false)`
- [ ] **5.3.3** Hàm `newSeed()` — trả `(Date.now() / 1000) % 2 - 1`
- [ ] **5.3.4** Hàm `fetchMore()`:
- [ ] **5.3.5** &nbsp;&nbsp;&nbsp;&nbsp;Guard: nếu `loading` → return
- [ ] **5.3.6** &nbsp;&nbsp;&nbsp;&nbsp;Nếu `offset >= total` → reset seed mới, offset = 0
- [ ] **5.3.7** &nbsp;&nbsp;&nbsp;&nbsp;Set `loading = true`
- [ ] **5.3.8** &nbsp;&nbsp;&nbsp;&nbsp;Gọi `getVideos(seed, offset, 10)`
- [ ] **5.3.9** &nbsp;&nbsp;&nbsp;&nbsp;Append vào `videos`, cập nhật `total`, `offset += videos.length`
- [ ] **5.3.10** &nbsp;&nbsp;&nbsp;&nbsp;Set `loading = false`
- [ ] **5.3.11** Export `{ videos, loading, fetchMore }`

#### 5.4 Components

##### VideoItem
- [ ] **5.4.1** Tạo `public/client/src/components/VideoItem.vue`
- [ ] **5.4.2** Props: `video` (object), `active` (boolean)
- [ ] **5.4.3** Render `<video :src="video.cf_url" loop playsinline :muted="!active">`
- [ ] **5.4.4** Watch `active`: nếu true → `video.play()`, nếu false → `video.pause()`
- [ ] **5.4.5** Hiển thị tên video ở góc dưới
- [ ] **5.4.6** Link tên → `/v/{video.id}-{video.slug}` (mở trang meta inject)
- [ ] **5.4.7** Hiển thị `NamePageLink` — "Xem thêm về [tên]" → `/n/{video.slug}`

##### NamePageLink
- [ ] **5.4.8** Tạo `public/client/src/components/NamePageLink.vue`
- [ ] **5.4.9** Props: `name`, `slug`
- [ ] **5.4.10** Render `<a :href="'/n/' + slug">Xem thêm về {{ name }}</a>`

##### VideoFeed
- [ ] **5.4.11** Tạo `public/client/src/components/VideoFeed.vue`
- [ ] **5.4.12** Import `useVideoFeed`, gọi `fetchMore()` khi mount
- [ ] **5.4.13** Render danh sách `VideoItem` với `scroll-snap`
- [ ] **5.4.14** CSS: `.feed { height: 100vh; overflow-y: scroll; scroll-snap-type: y mandatory; }` `.video-item { height: 100vh; scroll-snap-align: start; }`
- [ ] **5.4.15** Dùng `IntersectionObserver` theo dõi item đang visible → set `active`
- [ ] **5.4.16** Khi item áp cuối danh sách vào viewport → gọi `fetchMore()`
- [ ] **5.4.17** Preload: video kế tiếp active → thêm attribute `preload="auto"`

#### 5.5 App root
- [ ] **5.5.1** Tạo `public/client/src/App.vue` — render `<VideoFeed />` toàn màn hình
- [ ] **5.5.2** Thêm `setInterval(() => fetch('/health'), 14 * 60 * 1000)` trong `onMounted`
- [ ] **5.5.3** Tạo `public/client/src/main.js` — mount App
- [ ] **5.5.4** Tạo `public/client/src/style.css` — `* { margin: 0; padding: 0; box-sizing: border-box; }`, `body { background: #000; }`
- [ ] **5.5.5** Verify: `npm run dev` → thấy feed video scroll được

#### 5.6 Build & integration test
- [ ] **5.6.1** `npm run build` trong `public/client/`
- [ ] **5.6.2** `npm run prerender` trong `public/server/`
- [ ] **5.6.3** `npm run dev` trong `public/server/`
- [ ] **5.6.4** Truy cập `http://localhost:3001` → thấy feed video
- [ ] **5.6.5** Truy cập `/v/1-ten-video` → xem source HTML → thấy `<title>` và `og:video` đúng
- [ ] **5.6.6** Truy cập `/n/ten-slug` → thấy pre-rendered HTML
- [ ] **5.6.7** Truy cập `/sitemap.xml` → thấy XML hợp lệ

---

### PHASE 6 — Deploy lên Render

#### 6.1 Chuẩn bị
- [ ] **6.1.1** Push toàn bộ code lên GitHub repo
- [ ] **6.1.2** Đảm bảo `.gitignore` đã bao gồm `.env`, `dist`, `dist-prerender`, `node_modules`

#### 6.2 Deploy `video-admin`
- [ ] **6.2.1** Tạo Web Service mới trên Render, kết nối GitHub repo
- [ ] **6.2.2** Root dir: `admin/`
- [ ] **6.2.3** Build cmd: `cd client && npm i && npm run build && cd ../server && npm i && npm run build`
- [ ] **6.2.4** Start cmd: `cd server && node dist/index.js`
- [ ] **6.2.5** Thêm tất cả env vars: `DATABASE_URL`, `GITHUB_TOKEN`, `GITHUB_USERNAME`, `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `PORT=3000`
- [ ] **6.2.6** Deploy → chờ build xong
- [ ] **6.2.7** Verify: curl `https://video-admin.onrender.com/health` → trả JSON đúng
- [ ] **6.2.8** Verify: mở browser → thấy Vue admin UI

#### 6.3 Deploy `video-public-web`
- [ ] **6.3.1** Tạo Web Service mới, cùng GitHub repo
- [ ] **6.3.2** Root dir: `public/`
- [ ] **6.3.3** Build cmd: `cd client && npm i && npm run build && cd ../server && npm i && npm run build && npx tsx scripts/prerender.ts`
- [ ] **6.3.4** Start cmd: `cd server && node dist/index.js`
- [ ] **6.3.5** Thêm env vars: `DATABASE_URL`, `SITE_URL`, `PORT=3001`
- [ ] **6.3.6** Deploy → chờ build xong
- [ ] **6.3.7** Verify: curl `/health` → trả JSON đúng
- [ ] **6.3.8** Verify: curl `/sitemap.xml` → XML hợp lệ
- [ ] **6.3.9** Verify: view-source `/v/1-*` → thấy meta tags SEO

#### 6.4 Post-deploy
- [ ] **6.4.1** Mở Google Search Console → thêm property domain `video-public-web.onrender.com`
- [ ] **6.4.2** Submit `https://video-public-web.onrender.com/sitemap.xml`
- [ ] **6.4.3** Test upload từ admin UI → verify video xuất hiện trên public feed
- [ ] **6.4.4** Kiểm tra keep-alive: chờ 15 phút, curl health → response < 2s (không bị cold start)

---

## 11. Rủi ro & lưu ý

| Rủi ro | Giải pháp |
|---|---|
| `ORDER BY RANDOM()` chậm khi bảng lớn | Chấp nhận free tier; cache sau nếu cần |
| Pre-render cần DB lúc build | Render build có network, connect Aiven được |
| Thêm tên mới vào txt | Redeploy cả 2 service để sync |
| Vue router conflict với Hono routes | Mount `/v/`, `/n/` trước `/*` trong Hono |
| File txt rỗng | `loadNames()` throw lúc start — phát hiện sớm |
| Aiven 2 pool × 5 = 10 connections | Free tier ~25 — an toàn |
| Render cold start ~30s | Keep-alive mỗi 14 phút |
| File trùng tên trong repo | Prefix `<timestamp>_` tự động |
