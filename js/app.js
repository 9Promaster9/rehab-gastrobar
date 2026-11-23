(function () {
  "use strict";

  async function loadData() {
    try {
      const response = await fetch("data/data.json", { cache: "no-store" });
      if (response.ok) {
        return await response.json();
      }
    } catch (_err) {
      // Fallback to window.REHAB_DATA when opened locally via file://
    }
    return window.REHAB_DATA || null;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRestaurantInfo(data) {
    if (!data) return;

    const banner = document.getElementById("demo-banner");
    if (banner && data.meta && data.meta.demoBannerText) {
      banner.textContent = data.meta.demoBannerText;
    }

    const r = data.restaurant || {};
    const mapText = [
      ["hero-description", r.description],
      ["about-text-1", r.description],
      ["about-text-2", r.descriptionExtended],
      ["meta-check", r.averageCheck || "Н/Д"],
      ["meta-hours", r.hours || "Н/Д"],
      ["contact-address", r.address || "Н/Д"],
      ["contact-hours", r.hours || "Н/Д"]
    ];

    mapText.forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value) el.textContent = value;
    });

    const phoneEl = document.getElementById("contact-phone");
    if (phoneEl && r.phone) {
      phoneEl.textContent = r.phone;
      if (r.phoneRaw) {
        phoneEl.setAttribute("href", "tel:" + r.phoneRaw);
      }
    }

    if (data.menuStatus && data.menuStatus.unavailable) {
      const codeEl = document.getElementById("menu-code");
      const msgEl = document.getElementById("menu-message");
      if (codeEl) codeEl.textContent = data.menuStatus.code || "Н/Д";
      if (msgEl) msgEl.textContent = data.menuStatus.message || "меню сейчас недоступно";
    }

    const eventsList = document.getElementById("events-list");
    if (eventsList && Array.isArray(data.events)) {
      eventsList.innerHTML = data.events
        .map(
          (ev) => `
            <li class="editorial-list-item">
              <span class="editorial-list-day">${escapeHtml(ev.day)}</span>
              <h3 class="editorial-list-title">${escapeHtml(ev.title)}</h3>
              <p class="editorial-list-note">${escapeHtml(ev.note)}</p>
            </li>
          `
        )
        .join("");
    }
  }

  function renderReviewTab(data, key) {
    const container = document.getElementById("reviews-content");
    if (!container || !data || !data.reviews) return;

    const source = data.reviews[key];
    if (!source) {
      container.innerHTML = `
        <div class="reviews-empty">
          <p class="reviews-empty-code">Н/Д</p>
          <p>Данные по этому источнику отсутствуют.</p>
        </div>
      `;
      return;
    }

    const metaParts = [];
    if (source.rating && source.rating !== "Н/Д") {
      metaParts.push(`<span class="reviews-score-num">${escapeHtml(source.rating)}</span>`);
    }
    if (source.countText) {
      metaParts.push(`<span class="reviews-score-label">${escapeHtml(source.countText)}</span>`);
    } else if (source.summary) {
      metaParts.push(`<span class="reviews-score-label">${escapeHtml(source.summary)}</span>`);
    }
    if (source.award) {
      metaParts.push(`<span class="reviews-award">${escapeHtml(source.award)}</span>`);
    }

    const sourceLinkHtml = source.sourceUrl
      ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noopener noreferrer">Открыть ${escapeHtml(source.label)}</a>`
      : "";

    const metaHtml =
      metaParts.length > 0 || sourceLinkHtml
        ? `
          <div class="reviews-panel-meta">
            <div class="reviews-score">${metaParts.join("")}</div>
            ${sourceLinkHtml}
          </div>
        `
        : "";

    const highlightsHtml =
      Array.isArray(source.highlights) && source.highlights.length > 0
        ? `
          <div class="highlights-grid">
            ${source.highlights
              .map(
                (item) => `
                  <div class="highlight-item">
                    <span class="highlight-score">${escapeHtml(item.score)}</span>
                    <span class="highlight-topic">${escapeHtml(item.topic)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        `
        : "";

    let itemsHtml = "";
    if (Array.isArray(source.items) && source.items.length > 0) {
      itemsHtml = `
        <div class="reviews-list">
          ${source.items
            .map(
              (item) => `
                <article class="review-card">
                  <div class="review-card-top">
                    <span class="review-author">${escapeHtml(item.author)}</span>
                    <span class="review-stars">${escapeHtml(item.rating)} / 5</span>
                  </div>
                  <p class="review-text">${escapeHtml(item.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      `;
    } else {
      itemsHtml = `
        <div class="reviews-empty">
          <p class="reviews-empty-code">Н/Д</p>
          <p>${
            source.sourceUrl
              ? "Тексты отдельных отзывов не загружены в демо-версию — их можно просмотреть на странице источника."
              : "Отзывы из этого источника отсутствуют в демо-данных."
          }</p>
        </div>
      `;
    }

    container.innerHTML = metaHtml + highlightsHtml + itemsHtml;
  }

  function initReviewsTabs(data) {
    const buttons = document.querySelectorAll("[data-review-tab]");
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-review-tab");
        buttons.forEach((other) => {
          const active = other === btn;
          other.classList.toggle("is-active", active);
          other.setAttribute("aria-selected", String(active));
        });
        renderReviewTab(data, key);
      });
    });

    renderReviewTab(data, "yandex");
  }

  function initMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const mobileNav = document.getElementById("mobile-nav");
    if (!toggle || !mobileNav) return;

    toggle.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function initBookingForm() {
    const form = document.getElementById("booking-form");
    const dateInput = document.getElementById("booking-date");
    const modal = document.getElementById("demo-modal");
    const modalSummary = document.getElementById("modal-summary");
    const modalClose = document.getElementById("modal-close");

    if (!form || !modal || !modalSummary || !modalClose) return;

    const today = new Date();
    const isoToday = today.toISOString().split("T")[0];
    if (dateInput) {
      dateInput.min = isoToday;
      dateInput.value = isoToday;
    }

    function setError(fieldName, message) {
      const errEl = form.querySelector(`[data-error-for="${fieldName}"]`);
      if (errEl) errEl.textContent = message;
    }

    function openModal(summaryHtml) {
      modalSummary.innerHTML = summaryHtml;
      modal.hidden = false;
      modal.classList.add("is-open");
      modalClose.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.hidden = true;
    }

    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) {
        closeModal();
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const dateVal = form.elements.date.value.trim();
      const timeVal = form.elements.time.value.trim();
      const guestsVal = form.elements.guests.value.trim();
      const nameVal = form.elements.name.value.trim();
      const commentVal = form.elements.comment.value.trim();

      let valid = true;
      setError("date", "");
      setError("time", "");
      setError("guests", "");
      setError("name", "");

      if (!dateVal) {
        setError("date", "Укажите дату визита");
        valid = false;
      }
      if (!timeVal) {
        setError("time", "Укажите время");
        valid = false;
      }
      if (!guestsVal) {
        setError("guests", "Выберите количество гостей");
        valid = false;
      }
      if (nameVal.length < 2) {
        setError("name", "Введите имя (минимум 2 символа)");
        valid = false;
      }

      if (!valid) return;

      const summaryHtml = `
        <p><strong>Гость:</strong> ${escapeHtml(nameVal)}</p>
        <p><strong>Дата и время:</strong> ${escapeHtml(dateVal)}, ${escapeHtml(timeVal)}</p>
        <p><strong>Гостей:</strong> ${escapeHtml(guestsVal)}</p>
        <p><strong>Комментарий:</strong> ${escapeHtml(commentVal || "Н/Д")}</p>
      `;

      openModal(summaryHtml);
    });
  }

  function initRevealAnimations() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const data = await loadData();
    renderRestaurantInfo(data);
    initReviewsTabs(data);
    initMobileNav();
    initBookingForm();
    initRevealAnimations();
  });
})();
