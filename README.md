# The Sun Academy LMS

শিক্ষার্থী ও শিক্ষকরা **Academy ID + মোবাইল নম্বর** দিয়ে লগইন করবে।

| ফিচার | শিক্ষার্থী | শিক্ষক | অ্যাডমিন |
|---|---|---|---|
| রুটিন | নিজের ব্যাচেরটা দেখবে | যোগ/মোছা | যোগ/মোছা |
| পরীক্ষার তারিখ | দেখবে (কত দিন বাকি) | যোগ/মোছা | যোগ/মোছা |
| PDF | খুলবে/ডাউনলোড | আপলোড/মোছা | আপলোড/মোছা |
| হাজিরা | নিজের % ও রেকর্ড | হাজিরা নেবে + মাসিক রিপোর্ট | সব |
| সদস্য ও ব্যাচ | — | — | যোগ/এডিট/মোছা |

খরচ: **০ টাকা** — GitHub Pages (ওয়েবসাইট) + Supabase free (লগইন, ডাটাবেস, PDF)।
সবকিছু iPad/ফোনের ব্রাউজার থেকেই করা যায়।

---

## ধাপ ১ — Supabase প্রজেক্ট
1. supabase.com → **Start your project** → GitHub দিয়ে sign in।
2. **New project** → নাম `tsa-lms`, Region: **Singapore**, একটা Database password দিয়ে কোথাও লিখে রাখো → Create।

## ধাপ ২ — ডাটাবেস বানানো
1. বাম মেনু **SQL Editor** → **New query**।
2. `setup.sql` ফাইলের **পুরোটা** কপি করে paste → **Run**। "Success" দেখাবে।

## ধাপ ৩ — লগইন সেটিং (জরুরি)
**Authentication → Sign In / Providers → Email**:
- **Confirm email → OFF** (বন্ধ)
- **Allow new users to sign up → ON** (চালু; অ্যাডমিন প্যানেল এটা দিয়েই সদস্য যোগ করে)
- Save।

## ধাপ ৪ — নিজেকে প্রথম অ্যাডমিন বানানো
1. **Authentication → Users → Add user → Create new user**
   - Email: `tsa001@tsa.example.com` (তোমার Academy ID + `@tsa.example.com`)
   - Password: তোমার মোবাইল নম্বর (যেমন `01712345678`)
   - **Auto Confirm User ✓** → Create।
2. **SQL Editor → New query** → নিচেরটা (নিজের মান বসিয়ে) Run:
```sql
insert into public.members (id, academy_id, name, phone, role)
select id, 'tsa001', 'Musfiqur Rahman', '01712345678', 'admin'
from auth.users where email = 'tsa001@tsa.example.com';
```

## ধাপ ৫ — Key কপি
**Project Settings → API Keys** (বা Data API):
- **Project URL** (`https://xxxx.supabase.co`)
- **anon / publishable** key (⚠️ `service_role` / secret key কখনো না)

## ধাপ ৬ — config.js
`config.js` খুলে `SUPABASE_URL` আর `SUPABASE_ANON_KEY` বসাও। বাকিগুলো যেমন আছে রাখো।
(anon key ওয়েবসাইটে থাকাটা নিরাপদ — ডাটা Row Level Security দিয়ে সুরক্ষিত।)

## ধাপ ৭ — GitHub-এ ওয়েবসাইট চালু
1. github.com → **New repository** → নাম `tsa-lms` → **Public** → Create।
2. **Add file → Upload files** → এই ফোল্ডারের সব ফাইল (`index.html, app.js, style.css, config.js, setup.sql, README.md`) + তোমার লোগো `logo.png` নামে → **Commit**।
3. **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main`, ফোল্ডার `/ (root)` → Save।
4. ১–২ মিনিট পর লিংক: `https://তোমার-username.github.io/tsa-lms/`

## ধাপ ৮ — ব্যবহার শুরু
লগইন (tsa001 + মোবাইল) → **সদস্য** ট্যাব:
1. ব্যাচ বানাও (HSC 2027, SSC 2027…)।
2. শিক্ষক যোগ করো (ভূমিকা: শিক্ষক) — যেমন Sifat।
3. শিক্ষার্থী যোগ করো (ব্যাচসহ)। যোগ হলেই তারা লগইন করতে পারবে।

---

## পরে নিজের ডোমেইন
ডোমেইন কিনে **GitHub → Settings → Pages → Custom domain**-এ বসাও, আর ডোমেইন প্যানেলে GitHub-এর দেওয়া DNS রেকর্ড যোগ করো। কোড বদলাতে হবে না।

## Free plan-এর সীমা
- ডাটাবেস ৫০০ MB, PDF স্টোরেজ ১ GB, প্রতি ফাইল সর্বোচ্চ ৫০ MB।
- টানা ৭ দিন কেউ ব্যবহার না করলে Supabase প্রজেক্ট "pause" হয় — ড্যাশবোর্ড থেকে **Restore** চাপলেই আবার চালু (ফ্রি)। নিয়মিত ক্লাস চললে এটা হবে না।
- Free-তে অটো ব্যাকআপ নেই — মাঝে মাঝে Table Editor থেকে CSV export করে রেখো।
- একসাথে অনেক সদস্য যোগ করলে Supabase-এর sign-up limit লাগতে পারে; কয়েক মিনিট পর আবার চেষ্টা করো।

## জেনে রাখো
- পাসওয়ার্ড = মোবাইল নম্বর। কেউ অন্যের ID আর নম্বর জানলে লগইন করতে পারবে।
- কারো নম্বর বদলালে: সদস্য → এডিট → নতুন নম্বর → সেভ (পাসওয়ার্ডও বদলে যায়)।
- `EMAIL_DOMAIN` সদস্য যোগ করার পর আর বদলাবে না। "invalid email" error এলে শুরুতেই অন্য ডোমেইন নাম দিয়ে নাও (ধাপ ৪-এর ইমেইলেও একই ডোমেইন)।
