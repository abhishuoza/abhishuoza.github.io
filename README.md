# Personal Website

Portfolio and blog for Abhishu Oza. Built on the [Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) Jekyll theme, hosted on GitHub Pages.

## Setup

GitHub Pages builds the site automatically on push to `main`. To run locally:

1. Install Ruby and Bundler
2. `bundle install`
3. `bundle exec jekyll serve`
4. Visit `http://localhost:4000`

## Adding a blog post

Create `_posts/YYYY-MM-DD-slug.md`:

```yaml
---
title: "Post title"
date: YYYY-MM-DD
excerpt: "Short description."
---

Content...
```

## Adding a project post

Create `_portfolio/slug.md`:

```yaml
---
title: "Project title"
excerpt: "Short description."
date: YYYY-MM-DD
github: https://github.com/abhishuoza/repo
header:
  teaser: /assets/images/portfolio/slug-teaser.png
---

Content...
```

Add `published: false` to hide a post from the site without deleting it.

## Directory structure

```
abhishuoza.github.io/
├── _config.yml              # Jekyll + theme config
├── _data/navigation.yml     # Top nav links
├── _includes/               # Theme overrides (analytics, head)
├── _pages/                  # Top-level pages (portfolio, blog, cv)
├── _portfolio/              # Project posts
├── _posts/                  # Blog posts
├── assets/
│   ├── casts/               # asciinema casts
│   ├── css/main.scss        # Theme customizations
│   ├── images/              # Images and teasers
│   ├── js/                  # Interactive demo scripts
│   └── models/              # ONNX models for browser demos
├── index.html               # Home page
└── cv.pdf                   # Resume (linked from nav)
```
