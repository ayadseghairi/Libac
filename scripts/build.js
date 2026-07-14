#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'content');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(rootDir, 'assets');
const configPath = path.join(rootDir, 'config', 'site.json');
const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const basePath = process.env.BASE_PATH || siteConfig.basePath || '/Libac/';

const sectionMeta = {
  specialites: { label: 'تخصص', plural: 'التخصصات', folder: 'specialites' },
  universites: { label: 'جامعة', plural: 'الجامعات', folder: 'universites' },
  guides: { label: 'دليل', plural: 'الأدلة', folder: 'guides' }
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toSlug(input) {
  return String(input || '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripMarkdown(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDescription(frontMatter, markdown) {
  if (frontMatter.description) return String(frontMatter.description);
  const paragraphs = String(markdown || '').split(/\n\s*\n/).map((item) => stripMarkdown(item)).filter(Boolean);
  return paragraphs[0] || 'محتوى موجه للطلبة الجزائريين الجدد.';
}

function buildRelativeLink(fromFile, toFile) {
  const fromDir = path.dirname(fromFile).replace(/\\/g, '/');
  const toDir = path.dirname(toFile).replace(/\\/g, '/');
  let relative = path.posix.relative(fromDir, toDir);
  if (!relative || relative === '.') {
    relative = '.';
  }
  if (!relative.startsWith('.')) {
    relative = './' + relative;
  }
  return relative.replace(/\\/g, '/');
}

function makePagePath(section, slug) {
  return `${section}/${slug}/`;
}

function makePageOutputFile(section, slug) {
  return path.join(distDir, section, slug, 'index.html');
}

function copyDirectory(source, destination) {
  ensureDir(destination);
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function relativePath(fromOutputFile, toOutputFile) {
  const fromDir = path.posix.dirname(fromOutputFile);
  const relative = path.posix.relative(fromDir, toOutputFile);
  return relative ? relative.replace(/\\/g, '/') : './';
}

function renderPage({ title, description, updatedAt, section, slug, bodyHtml, navItems, pageType, contentItems, pageTitle, outputRelativeFile }) {
  const pageUrl = `${basePath}${makePagePath(section, slug)}`;
  const canonical = pageUrl;
  const stylesheetHref = relativePath(outputRelativeFile, 'assets/style.css');
  const appScriptSrc = relativePath(outputRelativeFile, 'assets/app.js');
  const siteRootHref = relativePath(outputRelativeFile, 'index.html').replace(/index\.html$/, '') || './';
  const homeHref = siteRootHref;
  const specialitesHref = relativePath(outputRelativeFile, 'specialites/index.html');
  const universitesHref = relativePath(outputRelativeFile, 'universites/index.html');
  const guidesHref = relativePath(outputRelativeFile, 'guides/index.html');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle || title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(pageTitle || title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta name="twitter:card" content="summary" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
  <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="${stylesheetHref}" />
</head>
<body>
  <header class="site-header">
    <a class="brand" href="${homeHref}">
      <img class="brand-logo" src="${relativePath(outputRelativeFile, 'assets/logo.jpg')}" alt="شعار Libac" />
      <span>
        <strong>Libac</strong>
        <small>دليل التوجيه الجامعي</small>
      </span>
    </a>
    <div class="header-actions">
      <label class="search-box" for="site-search">
        <i class='bx bx-search'></i>
        <input id="site-search" type="search" placeholder="ابحث عن تخصص أو جامعة أو دليل..." />
      </label>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="تبديل الوضع"><i class='bx bx-moon'></i></button>
      <button id="sidebar-toggle" class="sidebar-toggle" type="button" aria-label="فتح القائمة"><i class='bx bx-menu'></i></button>
    </div>
  </header>

  <div class="layout">
    <aside id="sidebar" class="sidebar">
      <nav>
        <h2>الصفحات</h2>
        <a href="${homeHref}">الرئيسية</a>
        <a href="${specialitesHref}">التخصصات</a>
        <a href="${universitesHref}">الجامعات</a>
        <a href="${guidesHref}">الأدلة</a>
      </nav>
      <div class="sidebar-section">
        <h3>أحدث المقالات</h3>
        <ul>
          ${contentItems.slice(0, 6).map((item) => `<li><a href="${relativePath(outputRelativeFile, item.outputRelativeFile)}">${escapeHtml(item.title)}</a></li>`).join('')}
        </ul>
      </div>
      <div class="sidebar-section">
        <h3>النتائج السريعة</h3>
        <ul>
          <li>${sectionMeta.specialites.plural}: ${contentItems.filter((item) => item.section === 'specialites').length}</li>
          <li>${sectionMeta.universites.plural}: ${contentItems.filter((item) => item.section === 'universites').length}</li>
          <li>${sectionMeta.guides.plural}: ${contentItems.filter((item) => item.section === 'guides').length}</li>
        </ul>
      </div>
    </aside>

    <main class="content-area">
      <div class="page-intro">
        <p class="page-type">${escapeHtml(pageType)}</p>
        <h1>${escapeHtml(title)}</h1>
        ${updatedAt ? `<p class="updated">آخر تحديث: ${escapeHtml(updatedAt)}</p>` : ''}
      </div>
      <article class="markdown-body">
        ${bodyHtml}
      </article>
      ${navItems ? `<section class="related-links">${navItems}</section>` : ''}
    </main>
  </div>

  <div id="search-results" class="search-results" aria-live="polite"></div>
  <script>window.__SITE_BASE_PATH__ = ${JSON.stringify(siteRootHref)};</script>
  <script src="${appScriptSrc}"></script>
</body>
</html>`;
}

function renderSectionPage(section, items, outputRelativeFile) {
  const sectionMetaInfo = sectionMeta[section];
  const cards = items.map((item) => `
    <article class="card">
      <h3><a href="${relativePath(outputRelativeFile, item.outputRelativeFile)}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.description)}</p>
    </article>`).join('');

  return renderPage({
    title: sectionMetaInfo.plural,
    description: `استعرض ${sectionMetaInfo.plural.toLowerCase()} المتوفرة على Libac.` ,
    updatedAt: '',
    section,
    slug: section,
    pageType: sectionMetaInfo.plural,
    contentItems: items,
    bodyHtml: `
      <section class="listing-section">
        <h2>${sectionMetaInfo.plural}</h2>
        <div class="cards-grid">${cards}</div>
      </section>
    `,
    outputRelativeFile
  });
}

function renderHomePage(items) {
  const specialites = items.filter((item) => item.section === 'specialites');
  const universites = items.filter((item) => item.section === 'universites');
  const guides = items.filter((item) => item.section === 'guides');

  const cards = [
    { title: 'التخصصات', count: specialites.length, href: `${basePath}specialites/`, description: 'اكتشف التخصصات المناسبة لشعب البكالوريا والآفاق الوظيفية.' },
    { title: 'الجامعات', count: universites.length, href: `${basePath}universites/`, description: 'اعرف الجامعة المناسبة لمدينةك ومجالك.' },
    { title: 'الأدلة', count: guides.length, href: `${basePath}guides/`, description: 'تابع خطوات التسجيل والانتقال إلى الحياة الجامعية بثقة.' }
  ];

  const specialiteCards = specialites.map((item) => {
    const filters = Array.isArray(item.frontMatter['شعب_البكالوريا'])
      ? item.frontMatter['شعب_البكالوريا']
      : (item.frontMatter['شعب_البكالوريا'] ? [item.frontMatter['شعب_البكالوريا']] : []);
    const filterValue = filters[0] || '';
    return `
    <article class="card" data-filter="${escapeHtml(filterValue)}">
      <h3><a href="${relativePath('index.html', item.outputRelativeFile)}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.description)}</p>
      <small>${escapeHtml(item.frontMatter.domaine || '')}</small>
    </article>`;
  }).join('');

  const universityCards = universites.map((item) => `
    <article class="card" data-filter="${escapeHtml(item.frontMatter['الجهة'] || '')}">
      <h3><a href="${relativePath('index.html', item.outputRelativeFile)}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.description)}</p>
      <small>${escapeHtml(item.frontMatter['الجهة'] || '')}</small>
    </article>`).join('');

  const guideCards = guides.map((item) => `
    <article class="card">
      <h3><a href="${relativePath('index.html', item.outputRelativeFile)}">${escapeHtml(item.title)}</a></h3>
      <p>${escapeHtml(item.description)}</p>
    </article>`).join('');

  return renderPage({
    title: 'Libac',
    description: 'منصة توجيه للطلبة الجزائريين الجدد لاختيار التخصص والجامعة المناسبين.',
    updatedAt: '',
    section: 'index',
    slug: 'index',
    pageType: 'الرئيسية',
    contentItems: items,
    bodyHtml: `
      <section class="hero">
        <h2>اختر تخصصك وجامعتك بثقة</h2>
        <p>موقع Libac يجمّع لك معلومات مبسطة عن التخصصات الجامعية والجامعات الجزائرية والأدلة العملية للطلبة الجدد.</p>
        <div class="stats-grid">
          ${cards.map((card) => `<article class="stat-card"><h3>${card.title}</h3><strong>${card.count}</strong><p>${card.description}</p><a href="${card.href}">المزيد</a></article>`).join('')}
        </div>
      </section>
      <section class="filters-section">
        <div class="filter-block">
          <label for="filter-speciality">تصفية التخصصات حسب شعبة البكالوريا</label>
          <select id="filter-speciality">
            <option value="">الكل</option>
            <option value="رياضيات">رياضيات</option>
            <option value="علوم تجريبية">علوم تجريبية</option>
            <option value="تقني رياضي">تقني رياضي</option>
          </select>
        </div>
        <div class="filter-block">
          <label for="filter-university">تصفية الجامعات حسب الجهة</label>
          <select id="filter-university">
            <option value="">الكل</option>
            <option value="الشرق">الشرق</option>
            <option value="الغرب">الغرب</option>
            <option value="الوسط">الوسط</option>
            <option value="الجنوب">الجنوب</option>
          </select>
        </div>
      </section>
      <section class="listing-section">
        <h2>التخصصات</h2>
        <div id="speciality-list" class="cards-grid">${specialiteCards}</div>
      </section>
      <section class="listing-section">
        <h2>الجامعات</h2>
        <div id="university-list" class="cards-grid">${universityCards}</div>
      </section>
      <section class="listing-section">
        <h2>الأدلة</h2>
        <div class="cards-grid">${guideCards}</div>
      </section>
    `,
    pageTitle: 'Libac | دليل التوجيه الجامعي',
    outputRelativeFile: 'index.html'
  });
}

function render404Page(items) {
  return renderPage({
    title: 'الصفحة غير موجودة',
    description: 'هذه الصفحة غير متوفرة في Libac بعد.',
    updatedAt: '',
    section: '404',
    slug: '404',
    pageType: '404',
    contentItems: items,
    bodyHtml: '<p>عذرًا، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. عد إلى الصفحة الرئيسية أو استخدم البحث.</p>',
    outputRelativeFile: '404.html'
  });
}

function buildContentItems() {
  const files = walk(contentDir);
  const items = [];
  const searchIndex = [];
  const contentBySource = new Map();

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(content);
    const frontMatter = parsed.data || {};
    const section = relativePath.split('/')[1];
    if (!sectionMeta[section]) continue;

    const title = frontMatter.title || path.basename(filePath, '.md');
    const slug = frontMatter.slug || toSlug(title);
    const updatedAt = frontMatter['تاريخ_التحديث'] || frontMatter.updatedAt || frontMatter.date || '';
    const description = getDescription(frontMatter, parsed.content);
    const markdownBody = parsed.content.trim();
    const pagePath = makePagePath(section, slug);
    const outputRelativeFile = `${section}/${slug}/index.html`;
    const outputFile = path.join(distDir, section, slug, 'index.html');

    const item = {
      sourceFile: filePath,
      relativePath,
      section,
      title,
      slug,
      updatedAt,
      description,
      frontMatter,
      markdownBody,
      pagePath,
      outputRelativeFile,
      outputFile
    };

    items.push(item);
    contentBySource.set(path.resolve(filePath), item);
    searchIndex.push({
      title,
      slug,
      type: sectionMeta[section].label,
      description,
      url: `${basePath}${pagePath}`,
      filters: { ...frontMatter }
    });
  }

  items.forEach((item) => {
    const htmlBody = marked.parse(rewriteLinks(item.markdownBody, item, contentBySource));
    const relatedLinks = buildRelatedLinks(item, items);
    const pageHtml = renderPage({
      title: item.title,
      description: item.description,
      updatedAt: item.updatedAt,
      section: item.section,
      slug: item.slug,
      pageType: sectionMeta[item.section].label,
      contentItems: items,
      bodyHtml: htmlBody,
      navItems: relatedLinks,
      outputRelativeFile: item.outputRelativeFile
    });

    ensureDir(path.dirname(item.outputFile));
    fs.writeFileSync(item.outputFile, pageHtml, 'utf8');
  });

  for (const section of Object.keys(sectionMeta)) {
    const sectionItems = items.filter((item) => item.section === section);
    const sectionOutputFile = path.join(distDir, section, 'index.html');
    ensureDir(path.dirname(sectionOutputFile));
    fs.writeFileSync(sectionOutputFile, renderSectionPage(section, sectionItems, `${section}/index.html`), 'utf8');
  }

  const homeHtml = renderHomePage(items);
  fs.writeFileSync(path.join(distDir, 'index.html'), homeHtml, 'utf8');
  fs.writeFileSync(path.join(distDir, '404.html'), render404Page(items), 'utf8');
  fs.writeFileSync(path.join(distDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2), 'utf8');
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');

  return { items, searchIndex };
}

function rewriteLinks(markdown, currentItem, contentBySource) {
  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, target) => {
    const cleanedTarget = target.trim();
    if (!cleanedTarget || cleanedTarget.startsWith('#') || /^(https?:|mailto:)/.test(cleanedTarget)) {
      return match;
    }

    if (cleanedTarget.endsWith('.md')) {
      const resolvedTarget = path.resolve(path.dirname(currentItem.sourceFile), cleanedTarget);
      const targetItem = contentBySource.get(resolvedTarget);
      if (targetItem) {
        const fromFile = path.join(path.dirname(currentItem.outputRelativeFile), 'index.html');
        const toFile = targetItem.outputRelativeFile;
        const relativeUrl = path.posix.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
        const cleanedUrl = relativeUrl.endsWith('/index.html') ? relativeUrl.replace(/\/index\.html$/, '/') : relativeUrl;
        return `[${label}](${cleanedUrl})`;
      }
    }

    return match;
  });
}

function buildRelatedLinks(item, items) {
  const related = [];
  if (item.section === 'specialites') {
    const targets = items.filter((candidate) => candidate.section === 'universites');
    related.push(`<h3>الجامعات التي تدرس هذا التخصص</h3><ul>${targets.slice(0, 6).map((candidate) => `<li><a href="${basePath}${makePagePath(candidate.section, candidate.slug)}">${escapeHtml(candidate.title)}</a></li>`).join('')}</ul>`);
  }

  if (item.section === 'universites') {
    const targets = items.filter((candidate) => candidate.section === 'specialites');
    related.push(`<h3>التخصصات المتاحة في هذه الجامعة</h3><ul>${targets.slice(0, 6).map((candidate) => `<li><a href="${basePath}${makePagePath(candidate.section, candidate.slug)}">${escapeHtml(candidate.title)}</a></li>`).join('')}</ul>`);
  }

  return related.length ? related.join('') : '';
}

function main() {
  ensureDir(distDir);
  if (fs.existsSync(assetsDir)) {
    copyDirectory(assetsDir, path.join(distDir, 'assets'));
  }
  buildContentItems();
  console.log('Build completed successfully.');
}

main();
