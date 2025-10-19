# Personal Website

Portfolio and blog for Abhishu Oza, built with Jekyll and hosted on GitHub Pages.

## Setup

This site uses Jekyll, which is automatically built by GitHub Pages. To run locally:

1. Install Ruby and Bundler
2. Run `bundle install`
3. Run `bundle exec jekyll serve`
4. Visit `http://localhost:4000`

## Adding Blog Posts

Create a new file in `_posts/` directory with the format:
```
_posts/YYYY-MM-DD-title-of-post.md
```

Use this frontmatter template:
```yaml
---
layout: post
title: "Your Post Title"
date: YYYY-MM-DD
author: Abhishu Oza
excerpt: "Brief description of the post"
---

Your markdown content here...
```

## Directory Structure

```
abhishuoza.github.io/
├── _config.yml          # Jekyll configuration
├── _layouts/            # Page templates
│   ├── default.html     # Base layout
│   └── post.html        # Blog post layout
├── _posts/              # Blog posts (markdown)
├── assets/
│   ├── images/          # Images
│   └── styles/          # CSS files
├── blog/
│   └── index.html       # Blog listing page
├── index.html           # Home page
└── cv.pdf               # Resume
```
