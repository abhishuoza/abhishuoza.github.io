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
├── _sass/site-custom.scss   # Customizations shared by both skins
├── assets/
│   ├── casts/               # asciinema casts
│   ├── css/main.scss        # Light skin + customizations
│   ├── css/dark.scss        # Dark skin + customizations
│   ├── images/              # Images and teasers
│   ├── js/                  # Interactive demo scripts
│   └── models/              # ONNX models for browser demos
├── index.html               # Home page
└── cv.pdf                   # Resume (linked from nav)
```

## Dark mode

`main.scss` and `dark.scss` are two full builds of the theme, differing only in
which Minimal Mistakes skin they import; both pull in `_sass/site-custom.scss`,
so any customization written there must take colours from Sass variables rather
than literals. `dark.css` ships with `media="not all"` and the toggle in
`_includes/head/custom.html` flips it to `media="all"`, which swaps skins with
no reload. The choice is stored in `localStorage` and defaults to the operating
system's preference.

Pages that style their own widgets (the interactive project demos) sit on the
page background rather than in a card of their own, so they carry their own
`[data-theme="dark"]` overrides in the page's `<style>` block.
