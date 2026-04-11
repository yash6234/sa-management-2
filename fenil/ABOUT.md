# About page API — A to Z (`fenil/`)

This document describes the **website About CMS** implemented under `fenil/`: Mongo models, routes, controller behavior, auth, encryption, image upload, and how a frontend should call each endpoint.

---

## 1. What lives in `fenil/` for About

| File | Purpose |
|------|---------|
| `fenil/routes/aboutRoutes.js` | Registers HTTP routes and multer for founder image |
| `fenil/controllers/aboutController.js` | Validation, merge rules, encryption of responses |
| `fenil/models/About.js` | Single `About` document schema (`about.*` sections) |
| `fenil/models/AboutImage.js` | Stored file metadata for the one image slot (`founderImage`) |
| `middlewares/aboutUploads.js` | Multer: disk dir `uploads/website/about`, 10 MB, jpeg/jpg/png/webp |
| `middlewares/adminValidation.js` | `validateAdminRequest` (GET-style) and `validateAdminRequestPost` (JSON / multipart `data` field) |
| `utils/enc_dec_admin.js` | `encryptData` / `decryptData` (CryptoJS AES, `ENCRYPTION_SECRET`) |

**Mount path** (from `server.js`):

```text
/acade360/website/about
```

Full examples below use `API_ORIGIN` (e.g. `https://your-server.com`).

---

## 2. Data model (what gets stored)

### 2.1 `About` document (`models/About.js`)

One document is used (controller **get-or-creates** if missing). Content lives under `about`:

| Section | Fields |
|---------|--------|
| `about_section` | `description`, `vision`, `mission`, `goals` (strings) |
| `directorsMessage` | `intro`, `smallIntro` |
| `founders` | `foundername`, `role`, `description`, `image` (path string; kept in sync with upload/delete) |
| `whyChooseUs` | `points` (array of strings) |

Top-level flags: `isActive`, Mongoose `timestamps`.

### 2.2 `AboutImage` document (`models/AboutImage.js`)

| Field | Notes |
|-------|--------|
| `fieldName` | Only `founderImage` (enum, unique) |
| `section` | `founders` |
| `filePath` | Server filesystem path (e.g. under `uploads/website/about/`) |
| `originalName`, `mimeType`, `isActive` | Metadata |

**Image path on the page:** `GetAbout` / `UpdateAbout` responses merge live `AboutImage` paths into `about.founders.image` via `attachImages()`.

---

## 3. Authentication and encryption (same pattern as Home)

### 3.1 Plaintext admin bundle (after decrypt)

Every operation expects a decrypted object that includes **at least**:

- `token` — JWT signed with `ADMIN_JWT_SECRET`
- `id` — admin user `_id`
- `mobile_no`, `email` — must match DB user and JWT claims

Operation-specific keys (`section`, `fields`, `fieldName`, `imageId`) are on the **same** object (single-layer encrypt), or follow your project’s optional double-layer pattern (outer decrypt yields `data` string → inner decrypt) as implemented in `validateAdminRequest` / `validateAdminRequestPost`.

### 3.2 GET-style validation (`validateAdminRequest`)

Used by: **GetAbout**, **GetAboutImages**, **UpdateAbout**.

Ciphertext can be supplied as **one** of:

- Path param **`data`** (see each route)
- Query **`?data=`**
- Headers **`x-admin-data`** or **`x-encrypted-payload`**

Server normalizes (`decodeURIComponent`, spaces → `+`) then decrypts.

### 3.3 POST-style validation (`validateAdminRequestPost`)

Used by: **UploadAboutImage**, **DeleteAboutImage**.

Body must include:

```json
{ "data": "<AES ciphertext string>" }
```

For **multipart** upload, the same **`data`** field is a **form field** (string), not JSON body.

### 3.4 Responses

Success payloads often return:

```json
{ "success": true, "message": "...", "data": "<encrypted string>" }
```

Decrypt `data` with the same secret/algorithm as the server’s `encryptData`.

---

## 4. Route map (A → Z)

| Order | Method | Path | Handler | Purpose |
|-------|--------|------|---------|---------|
| A | `GET` | `/acade360/website/about/get/:data` | `GetAbout` | Fetch full About doc; merge founder image path |
| B | `GET` | `/acade360/website/about/images/:data` | `GetAboutImages` | List active `AboutImage` rows (encrypted) |
| C | `GET` | `/acade360/website/about/update/:data` | `UpdateAbout` | Merge one section (or `all`) — **see §5** |
| D | `POST` | `/acade360/website/about/upload-image` | `UploadAboutImage` | Upload/replace founder image — **multipart** |
| E | `POST` | `/acade360/website/about/delete-image` | `DeleteAboutImage` | Delete by `imageId` — **JSON** |

**Important:** Unlike the Home module, **About content updates use `GET …/update/:data`**, not `POST` + JSON body. Only delete-image and upload-image use `POST`.

---

## 5. Update About content (`GET …/update/:data`)

### 5.1 Behavior

- Auth: **GET** validator → encrypted bundle in **`data` path segment** (or same alternatives as §3.2 if your gateway forwards headers/query; the route is defined with **`:data` in the path**, so typical usage is `GET .../update/<ciphertext>`).
- After decrypt, **`section`** and **`fields`** are required; `fields` must be a **non-null object** (see controller).

### 5.2 Allowed `section` values

`about_section`, `directorsMessage`, `founders`, `whyChooseUs`, `all`

- **`all`:** `doc.about = { ...existingAbout, ...fields }` (shallow merge at root of `about`).
- **Other sections:** shallow merge `{ ...existingSection, ...fields }` into `doc.about[section]`.

### 5.3 Plaintext payload shape (encrypt entire object → put in `data` segment)

```json
{
  "token": "<jwt>",
  "id": "<adminId>",
  "mobile_no": "<string>",
  "email": "<string>",
  "section": "about_section",
  "fields": {
    "vision": "Updated vision text",
    "mission": "Updated mission text"
  }
}
```

Example `whyChooseUs`:

```json
{
  "token": "...",
  "id": "...",
  "mobile_no": "...",
  "email": "...",
  "section": "whyChooseUs",
  "fields": {
    "points": ["Point A", "Point B"]
  }
}
```

### 5.4 Frontend note (URL length)

Putting a large ciphertext in the **URL path** can hit **browser/proxy URL length limits**. If you hit 414 or broken requests, consider adding a **`POST /update`** route in the backend (same as Home) or sending the bundle via **`x-admin-data` / `x-encrypted-payload`** on a **`GET /update`** route without path ciphertext — that would require a **small route change**; as shipped, the param is **`/update/:data`**.

---

## 6. Fetch About (`GET …/get/:data`)

Returns one About document; `about.founders.image` is filled from `AboutImage` when present.

Response: `{ success, message, data: <encrypted> }`.

---

## 7. Fetch image records only (`GET …/images/:data`)

Returns `AboutImage.find({ isActive: true })`, encrypted in `data`.

---

## 8. Upload founder image (`POST …/upload-image`)

### 8.1 Do **not** send the file on the update route

**Update** only accepts the encrypted **GET** bundle with `section` / `fields` (text and structured fields). **Binary images** go only through **`POST /upload-image`** (multer).

### 8.2 Multipart rules

- **Directory:** `uploads/website/about/`
- **Limits:** 10 MB; **MIME:** jpeg, jpg, png, webp

Send **multipart/form-data** with:

| Part | Required | Description |
|------|----------|-------------|
| `data` | Yes | **String**: ciphertext of JSON including auth + **`fieldName": "founderImage"`** |
| `founderImage` | Yes | The **file**; form field name **must** equal `fieldName` (`founderImage`) |

Multer is configured as `upload.fields([{ name: "founderImage", maxCount: 1 }])`. The controller reads `req.files[fieldName][0]`.

### 8.3 Example (browser)

```javascript
const plaintext = {
  token: adminJwt,
  id: adminId,
  mobile_no: mobile,
  email: email,
  fieldName: "founderImage",
};
const cipher = encryptWithCryptoJs(plaintext); // same rules as server

const form = new FormData();
form.append("data", cipher);
form.append("founderImage", fileInput.files[0], fileInput.files[0].name);

await fetch(`${API_ORIGIN}/acade360/website/about/upload-image`, {
  method: "POST",
  body: form,
});
```

### 8.4 Success response

Encrypted `data` typically includes `fieldName`, `filePath`, `imageId` (Mongo `_id` of `AboutImage`).

---

## 9. Delete founder image (`POST …/delete-image`)

**Content-Type:** `application/json`

```json
{ "data": "<ciphertext>" }
```

Plaintext before encrypt must include auth fields plus:

```json
{ "imageId": "<AboutImage _id>" }
```

Clears disk file, removes `AboutImage` row, sets `about.founders.image` to `""`.

---

## 10. End-to-end frontend checklist

1. **Base URL:** `API_ORIGIN + '/acade360/website/about'`.
2. **Login:** obtain admin JWT and `id`, `mobile_no`, `email` like the rest of the admin app.
3. **Crypto:** implement `encryptData` / `decryptData` compatible with `enc_dec_admin.js` (or call a trusted backend-for-frontend); never expose `ENCRYPTION_SECRET` in a public bundle.
4. **Read page:** `GET .../get/<data>` (or headers/query per validator).
5. **Edit copy / sections:** build plaintext `{ token, id, mobile_no, email, section, fields }` → encrypt → `GET .../update/<ciphertext>` (watch URL length).
6. **Change photo:** `POST .../upload-image` with `FormData`: `data` + `founderImage` file.
7. **Remove photo:** `POST .../delete-image` with JSON `{ data }` including `imageId`.
8. **Display images:** `filePath` is a server path; ensure HTTP static serving or CDN mapping for `uploads/website/about/` (same operational note as Home).

---

## 11. Related code references

- Routes: `fenil/routes/aboutRoutes.js`
- Controller: `fenil/controllers/aboutController.js`
- Models: `fenil/models/About.js`, `fenil/models/AboutImage.js`
- Upload middleware: `middlewares/aboutUploads.js`
- App mount: `server.js` → `app.use('/acade360/website/about', require('./fenil/routes/aboutRoutes'))`

**Note:** `server.js` also mounts **Jenil** CMS routes at `cmsRouter.use('/about', ...)` — that is a **different** module (`jenil/routes/aboutAcademyRoutes`). This doc is only for **`fenil`** + `/acade360/website/about`.
