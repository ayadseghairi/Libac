(function () {
  const basePath = window.__SITE_BASE_PATH__ || './';
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const searchInput = document.getElementById('site-search');
  const searchResults = document.getElementById('search-results');
  const specialityFilter = document.getElementById('filter-speciality');
  const universityFilter = document.getElementById('filter-university');
  const specialityList = document.getElementById('speciality-list');
  const universityList = document.getElementById('university-list');

  const storedTheme = localStorage.getItem('libac-theme');
  if (storedTheme === 'dark') {
    body.classList.add('dark');
  } else if (storedTheme === 'light') {
    body.classList.remove('dark');
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    body.classList.add('dark');
  }

  themeToggle && themeToggle.addEventListener('click', () => {
    const isDark = body.classList.toggle('dark');
    localStorage.setItem('libac-theme', isDark ? 'dark' : 'light');
  });

  sidebarToggle && sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  async function loadSearchIndex() {
    try {
      const response = await fetch(`${basePath}search-index.json`);
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      return [];
    }
  }

  function renderResults(items) {
    if (!searchResults) return;
    if (!items.length) {
      searchResults.innerHTML = '<div class="result-item">لا توجد نتائج.</div>';
      searchResults.classList.add('show');
      return;
    }
    searchResults.innerHTML = items.slice(0, 6).map((item) => `
      <div class="result-item">
        <a href="${item.url}">${item.title}</a>
        <div>${item.description}</div>
      </div>
    `).join('');
    searchResults.classList.add('show');
  }

  let searchIndex = [];
  loadSearchIndex().then((items) => { searchIndex = items; });

  searchInput && searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    if (!query) {
      searchResults.classList.remove('show');
      return;
    }
    const results = searchIndex.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.type} ${JSON.stringify(item.filters || {})}`.toLowerCase();
      return haystack.includes(query);
    });
    renderResults(results);
  });

  document.addEventListener('click', (event) => {
    if (!searchResults.contains(event.target) && event.target !== searchInput) {
      searchResults.classList.remove('show');
    }
  });

  function applyFilters() {
    if (!specialityList || !universityList) return;
    const specialityValue = specialityFilter ? specialityFilter.value : '';
    const universityValue = universityFilter ? universityFilter.value : '';
    Array.from(specialityList.children).forEach((card) => {
      const value = card.getAttribute('data-filter');
      card.style.display = !specialityValue || value === specialityValue ? 'block' : 'none';
    });
    Array.from(universityList.children).forEach((card) => {
      const value = card.getAttribute('data-filter');
      card.style.display = !universityValue || value === universityValue ? 'block' : 'none';
    });
  }

  specialityFilter && specialityFilter.addEventListener('change', applyFilters);
  universityFilter && universityFilter.addEventListener('change', applyFilters);
})();
