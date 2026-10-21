/* Local interactions for screen review only. No backend calls or real authentication. */
(() => {
  const demo = window.demoData;
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  let viewState = params.get("state") || "";
  let currentPage = 0;
  const pageSize = 8;
  const key = "acme-screen-prototype-v1";
  let stored;
  try {
    stored = JSON.parse(sessionStorage.getItem(key));
  } catch {
    stored = null;
  }
  const state = stored || {
    employees: structuredClone(demo.employees),
    histories: {},
  };
  const save = () => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* Preview also works without storage. */
    }
  };
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const number = (value) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
      Number(value),
    );
  const amount = (value) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  const money = (value, currency) => `${escape(currency)} ${amount(value)}`;
  const compact = (value) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(Number(value));
  const date = (value) =>
    value
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(value))
      : "—";
  const countryName = (code) =>
    demo.countries.find((country) => country[0] === code)?.[1] || code;
  const initials = (name) =>
    name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("");
  const url = (file, id) => `${file}?id=${encodeURIComponent(id)}`;
  const currentEmployee = () =>
    state.employees.find((employee) => employee.id === params.get("id")) ||
    state.employees[0];
  const status = (employee) =>
    employee.joined > demo.asOf
      ? "upcoming"
      : employee.left && employee.left < demo.asOf
        ? "departed"
        : "active";
  const badge = (employee) => {
    const value = status(employee);
    return `<span class="badge ${value}">${value[0].toUpperCase() + value.slice(1)}</span>`;
  };
  const country = (code) =>
    `<span class="country-marker">${escape(code)}</span>${escape(countryName(code))}`;
  const table = (headings, rows, numeric = [], wide = false) =>
    `<div class="table-wrap"><table class="${wide ? "report-table-wide" : ""}"><thead><tr>${headings.map((heading, index) => `<th scope="col" class="${numeric.includes(index) ? "num" : ""}">${heading}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => `<td class="${numeric.includes(index) ? "num" : ""}">${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const pager = (total) =>
    `<div class="table-footer"><span>${number(currentPage * pageSize + 1)}–${number(Math.min((currentPage + 1) * pageSize, total))} of ${number(total)} results</span><div class="pagination"><button class="button secondary small" data-page="${currentPage - 1}" ${currentPage === 0 ? "disabled" : ""}>← Previous</button><span class="page-number" aria-label="Current page">${currentPage + 1}</span><button class="button secondary small" data-page="${currentPage + 1}" ${(currentPage + 1) * pageSize >= total ? "disabled" : ""}>Next →</button></div></div>`;
  const slice = (rows) =>
    rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const percent = (value) =>
    value == null
      ? '<span class="muted" title="No prior-year comparison group">—</span>'
      : `<span class="${value >= 0 ? "positive" : "negative"}">${value > 0 ? "+" : ""}${Number(value).toFixed(2)}%</span>`;
  const person = (employee) =>
    `<div class="employee-name"><span class="avatar" aria-hidden="true">${escape(initials(employee.name))}</span><div><a class="table-link" href="${url("employee.html", employee.id)}">${escape(employee.name)}</a><small>${escape(employee.id)}</small></div></div>`;

  const icon = (paths) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    employees: icon(
      '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',
    ),
    commitment: icon(
      '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>',
    ),
    departments: icon(
      '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    ),
    growth: icon('<path d="M4 17l6-6 4 3 6-8M14 6h6v6"/>'),
    history: icon(
      '<path d="M4 3v18h17M8 16l4-5 4 2 5-7M8 20v-1m4 1v-4m4 4v-3m4 3v-8"/>',
    ),
    building: icon(
      '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-6h4v6"/>',
    ),
    library: icon(
      '<rect x="3" y="3" width="7" height="18" rx="1.5"/><path d="M14 3l7 1-2 17-7-1zM6 7h1M6 10h1"/>',
    ),
    logout: icon('<path d="M9 5H5v14h4M13 8l4 4-4 4M8 12h13"/>'),
    menu: icon('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    chevron: icon('<path d="m9 5 7 7-7 7"/>'),
  };
  if (document.querySelector("#sidebar")) {
    const employeePage = !page.startsWith("report-");
    document.querySelector("#sidebar").innerHTML = `
      <a class="brand" href="employees.html"><span class="brand-mark">${icon('<path d="M5 18V11M12 18V5M19 18V8" stroke-width="3"/>')}</span><span>acme<small>People & pay</small></span></a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="workspace-navigation">${icons.menu} Menu</button>
      <nav id="workspace-navigation" aria-label="Workspace">
        <div class="nav-label">People</div>
        <a class="nav-item ${employeePage ? "active" : ""}" ${employeePage ? 'aria-current="page"' : ""} href="employees.html">${icons.employees}<span>Employees</span></a>
        <div class="nav-label reports-label">Reports</div>
        ${[
          ["commitment", "Salary commitment"],
          ["departments", "Departments"],
          ["growth", "Salary growth"],
          ["history", "Historical benchmark"],
        ]
          .map(
            ([id, label]) =>
              `<a class="nav-item ${page === `report-${id}` ? "active" : ""}" ${page === `report-${id}` ? 'aria-current="page"' : ""} href="report-${id}.html">${icons[id]}<span>${label}</span></a>`,
          )
          .join("")}
      </nav>
      <div class="sidebar-footer">
        <a class="library-link" href="index.html">${icons.library}<span>Screen library</span></a>
        <div class="sidebar-account"><span class="avatar" aria-hidden="true">HR</span><div><strong>Demo HR</strong><small>HR workspace</small></div><a class="account-logout" href="login.html" aria-label="Sign out">${icons.logout}</a></div>
      </div>`;
    document
      .querySelector(".menu-toggle")
      .addEventListener("click", (event) => {
        const button = event.currentTarget;
        const expanded = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", String(expanded));
        document
          .querySelector("#sidebar")
          .classList.toggle("menu-open", expanded);
      });
  }

  document.querySelectorAll("[data-options]").forEach((select) => {
    const lookup = select.dataset.options;
    const all =
      lookup === "countries"
        ? "All countries"
        : lookup === "departments"
          ? "All departments"
          : "All currencies";
    const options =
      lookup === "countries"
        ? demo.countries.map(([code, name]) => [code, name])
        : demo[lookup].map((item) => [item, item]);
    select.innerHTML =
      (select.hasAttribute("data-form-select")
        ? ""
        : `<option value="">${all}</option>`) +
      options
        .map(
          ([value, label]) =>
            `<option value="${escape(value)}">${escape(label)}</option>`,
        )
        .join("");
    if (select.dataset.value) select.value = select.dataset.value;
  });

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 4000);
  }

  function stateView(kind) {
    if (kind === "loading")
      return '<div class="card empty-state" role="status"><span class="spinner" aria-hidden="true"></span><h2>Loading report</h2><p></p></div>';
    if (kind === "error")
      return '<div class="card empty-state" role="alert"><h2>We couldn’t load these records</h2><p></p><button class="button secondary" data-action="retry">Try again</button></div>';
    return '<div class="card empty-state"><h2>No matching records</h2><p>Adjust your search or filters.</p><button class="button secondary" data-action="reset-filters">Clear filters</button></div>';
  }

  function renderEmployees() {
    const form = document.querySelector("#employee-filters");
    const filters = Object.fromEntries(new FormData(form));
    const search = String(filters.search || "")
      .trim()
      .toLowerCase();
    const rows = state.employees
      .filter(
        (employee) =>
          (!search ||
            `${employee.name} ${employee.id}`.toLowerCase().includes(search)) &&
          (!filters.country || employee.country === filters.country) &&
          (!filters.department || employee.department === filters.department) &&
          (!filters.status || status(employee) === filters.status),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const overviewRows = viewState === "empty" ? [] : rows;
    document.querySelector("#employee-overview").innerHTML = overview(
      "People overview",
      [
        ["Employees", number(overviewRows.length)],
        [
          "Active",
          number(overviewRows.filter((row) => status(row) === "active").length),
        ],
        ["Countries", new Set(overviewRows.map((row) => row.country)).size],
      ],
      employmentMix(overviewRows),
    );
    const target = document.querySelector("#directory-body");
    if (viewState || !rows.length) {
      target.innerHTML = stateView(viewState || "empty");
      return;
    }
    target.innerHTML =
      table(
        [
          "Employee",
          "Department",
          "Work country",
          "Status",
          "Annual base pay",
          "",
        ],
        slice(rows).map((employee) => [
          person(employee),
          escape(employee.department),
          country(employee.country),
          badge(employee),
          money(employee.pay, employee.currency),
          `<a class="row-action" href="${url("employee.html", employee.id)}" aria-label="View ${escape(employee.name)}">↗</a>`,
        ]),
        [4],
      ) + pager(rows.length);
  }

  function employeeHistory(employee) {
    if (state.histories[employee.id]) return state.histories[employee.id];
    if (employee.id === "EMP00001") return structuredClone(demo.history);
    return Array.from({ length: employee.revision }, (_, index) => ({
      revision: employee.revision - index,
      date: `${2026 - index}-04-01T09:00:00Z`,
      pay: (Number(employee.pay) / 1.05 ** index).toFixed(2),
      currency: employee.currency,
      country: employee.country,
      department: employee.department,
      actor: "Demo HR",
      reason:
        index === employee.revision - 1 ? "Initial salary" : "Salary review",
    }));
  }

  function renderProfile() {
    const employee = currentEmployee();
    const rows = employeeHistory(employee);
    document.querySelector("#employee-profile").innerHTML = `
      <div class="page-heading profile-heading">
        <div class="employee-heading"><span class="avatar" aria-hidden="true">${escape(initials(employee.name))}</span><div><h1>${escape(employee.name)}</h1><div class="employee-meta"><span>${escape(employee.id)}</span>${badge(employee)}</div></div></div>
        <div class="heading-actions"><a class="button secondary" href="${url("employee-edit.html", employee.id)}">Edit details</a>${status(employee) === "departed" ? "" : `<a class="button" href="${url("salary-change.html", employee.id)}">Change salary</a>`}</div>
      </div>
      <section class="card profile-overview" aria-label="Employee details and current salary">
        <dl class="profile-facts">${[
          ["Department", employee.department],
          ["Country", countryName(employee.country)],
          ["Joined", date(employee.joined)],
          ["Last working day", date(employee.left)],
        ]
          .map(
            ([label, value]) =>
              `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`,
          )
          .join("")}</dl>
        <div class="profile-pay"><span>Annual base pay</span><strong>${money(employee.pay, employee.currency)}</strong><small>Revision ${employee.revision} · ${date(rows[0].date)} · ${escape(rows[0].actor)}</small></div>
      </section>
      <section class="card timeline"><div class="card-header"><h2>Salary history</h2><span class="badge neutral">Read only</span></div>${table(
        [
          "Revision / date",
          "Annual base pay",
          "Country",
          "Department",
          "Recorded by",
          "Reason",
        ],
        rows.map((entry) => [
          `<strong>${entry.revision}</strong><div class="history-reason">${date(entry.date)} · ${entry.date.slice(11, 16)} UTC</div>`,
          money(entry.pay, entry.currency),
          country(entry.country),
          escape(entry.department),
          escape(entry.actor),
          escape(entry.reason),
        ]),
        [1],
      )}</section>`;
    const saved = params.get("saved");
    if (saved)
      showToast(
        saved === "salary"
          ? "Salary updated."
          : saved === "created"
            ? "Employee created."
            : "Employee details saved.",
      );
  }

  function error(message) {
    const target = document.querySelector("#form-error");
    target.textContent = message;
    target.hidden = false;
    target.scrollIntoView({ block: "nearest" });
  }

  function setupEmployeeForm() {
    const edit = page === "employee-edit";
    const employee = currentEmployee();
    const form = document.querySelector("#employee-form");
    if (edit) {
      for (const name of [
        "id",
        "name",
        "department",
        "country",
        "joined",
        "left",
      ])
        form.elements[name].value = employee[name] || "";
      for (const id of ["form-back", "form-cancel"])
        document.getElementById(id).href = url("employee.html", employee.id);
    } else {
      form.elements.id.value = "EMP10001";
      form.elements.joined.value = demo.asOf;
    }
    if (viewState === "error") {
      form.elements.name.value = "Aarav Sharma";
      error("Employee ID already exists. Choose another ID.");
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      if (
        !edit &&
        state.employees.some(
          (item) => item.id.toLowerCase() === fields.id.trim().toLowerCase(),
        )
      ) {
        error("Employee ID already exists. Choose another ID.");
        return;
      }
      if (fields.left && fields.left < fields.joined) {
        error(
          "Check the employment dates. The last working day must be on or after joining.",
        );
        return;
      }
      const result = {
        ...(edit
          ? employee
          : {
              pay: Number(fields.pay).toFixed(2),
              currency: fields.currency,
              revision: 1,
            }),
        id: edit ? employee.id : fields.id.trim(),
        name: fields.name.trim(),
        department: fields.department,
        country: fields.country,
        joined: fields.joined,
        left: fields.left || null,
      };
      if (edit)
        state.employees[
          state.employees.findIndex((item) => item.id === employee.id)
        ] = result;
      else {
        state.employees.push(result);
        state.histories[result.id] = [
          {
            revision: 1,
            date: demo.asOf + "T10:00:00Z",
            pay: result.pay,
            currency: result.currency,
            country: result.country,
            department: result.department,
            actor: "Demo HR",
            reason: "Initial salary",
          },
        ];
      }
      save();
      location.href =
        url("employee.html", result.id) +
        `&saved=${edit ? "details" : "created"}`;
    });
  }

  function setupSalaryForm() {
    const employee = currentEmployee();
    let expectedRevision = employee.revision;
    let forcedConflict = viewState === "conflict";
    const form = document.querySelector("#salary-form");
    document.querySelector("#salary-person").innerHTML = person(employee);
    document.querySelector("#current-pay").textContent = money(
      employee.pay,
      employee.currency,
    );
    document.querySelector("#current-revision").textContent =
      `Revision ${employee.revision}`;
    for (const id of ["salary-back", "salary-cancel"])
      document.getElementById(id).href = url("employee.html", employee.id);
    form.elements.pay.value = (Number(employee.pay) * 1.05).toFixed(2);
    form.elements.currency.value = employee.currency;
    function updateDelta() {
      const same = form.elements.currency.value === employee.currency;
      const change =
        (Number(form.elements.pay.value) / Number(employee.pay) - 1) * 100;
      document.querySelector("#salary-delta").textContent =
        same && form.elements.pay.value
          ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}% from current pay`
          : "Currency change · No automatic conversion";
    }
    form.addEventListener("input", updateDelta);
    updateDelta();
    function conflict() {
      const target = document.querySelector("#form-error");
      target.innerHTML =
        'Salary changed. Your entries are kept; reload the current salary to continue.<br><button type="button" id="reload-salary">Reload current salary</button>';
      target.hidden = false;
      document.querySelector("#reload-salary").onclick = () => {
        expectedRevision = employee.revision;
        forcedConflict = false;
        target.hidden = true;
        showToast("Current salary reloaded. Review and save.");
      };
    }
    if (forcedConflict) {
      form.elements.reason.value = "Annual salary review";
      conflict();
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (forcedConflict || employee.revision !== expectedRevision) {
        conflict();
        return;
      }
      const history = employeeHistory(employee);
      employee.pay = Number(form.elements.pay.value).toFixed(2);
      employee.currency = form.elements.currency.value;
      employee.revision++;
      history.unshift({
        revision: employee.revision,
        date: demo.asOf + "T10:00:00Z",
        pay: employee.pay,
        currency: employee.currency,
        country: employee.country,
        department: employee.department,
        reason: form.elements.reason.value.trim(),
        actor: "Demo HR",
      });
      state.histories[employee.id] = history;
      save();
      location.href = url("employee.html", employee.id) + "&saved=salary";
    });
  }

  function departmentRows() {
    return demo.commitment.flatMap((group) => {
      const mix = demo.departmentMix[group.country];
      const weighted = mix.reduce(
        (sum, share, index) => sum + share * demo.payFactors[index],
        0,
      );
      let remaining = group.count;
      let totalLeft = group.total;
      return demo.departments.map((department, index) => {
        const count =
          index === 4
            ? remaining
            : Math.round((group.count * mix[index]) / 100);
        const total =
          index === 4
            ? totalLeft
            : Math.round(
                ((group.total * mix[index] * demo.payFactors[index]) /
                  weighted) *
                  100,
              ) / 100;
        remaining -= count;
        totalLeft -= total;
        return { ...group, department, count, total, average: total / count };
      });
    });
  }

  function filteredGroups(filters) {
    const rows = departmentRows().filter(
      (row) =>
        (!filters.country || row.country === filters.country) &&
        (!filters.department || row.department === filters.department) &&
        (!filters.currency || row.currency === filters.currency),
    );
    const groups = new Map();
    for (const row of rows) {
      const key = row.country + row.currency;
      const group = groups.get(key) || {
        country: row.country,
        currency: row.currency,
        count: 0,
        total: 0,
      };
      group.count += row.count;
      group.total += row.total;
      groups.set(key, group);
    }
    return { rows, groups: [...groups.values()] };
  }

  function overview(context, metrics, visual) {
    return `<section class="overview ${visual ? "" : "overview-metrics-only"}" aria-label="Overview"><div class="overview-main"><div class="overview-scope">${context}</div><div class="overview-metrics ${metrics.length === 4 ? "metrics-4" : ""}">${metrics.map(([label, value, detail]) => `<div class="overview-metric"><span class="overview-label">${label}</span><strong class="overview-value">${value}</strong>${detail ? `<small class="overview-detail">${detail}</small>` : ""}</div>`).join("")}</div></div>${visual ? `<div class="overview-visual">${visual}</div>` : ""}</section>`;
  }

  function miniBars(entries, label) {
    const visible = entries.slice(0, 7);
    const max = Math.max(...visible.map((entry) => entry[1]), 1);
    const slot = 240 / visible.length;
    return `<div class="mini-chart-caption">${label}</div><svg class="sparkline mini-chart mini-bars-chart" viewBox="0 0 240 54" role="img" aria-label="${escape(label)}">${visible
      .map(([name, value], index) => {
        const height = Math.max(2, (value / max) * 47);
        return `<g><title>${escape(name)}: ${number(value)}</title><rect x="${index * slot + slot * 0.18}" y="${51 - height}" width="${slot * 0.64}" height="${height}" rx="3" fill="var(--accent)" opacity="${index === 0 ? 1 : 0.45 + index * 0.05}"/></g>`;
      })
      .join(
        "",
      )}</svg><div class="mini-axis">${visible.map(([name]) => `<span>${escape(name)}</span>`).join("")}</div>`;
  }

  function miniTrend(values, label, reference = []) {
    const all = [...values, ...reference];
    const min = Math.min(...all),
      max = Math.max(...all);
    const range = max - min || Math.abs(max) * 0.1 || 1;
    const x = (index) => 4 + (index / Math.max(values.length - 1, 1)) * 232;
    const y = (value) => 54 - ((value - min) / range) * 42;
    const path = (points) =>
      points
        .map(
          (value, index) =>
            `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
        )
        .join(" ");
    const line = path(values);
    return `<div class="mini-chart-caption">${label}</div><svg class="sparkline mini-chart" viewBox="0 0 240 64" role="img" aria-label="${escape(label)}"><path d="M4 58H236" fill="none" stroke="var(--line)"/><path d="${line} L${x(values.length - 1)} 58 L4 58 Z" fill="var(--accent-soft)"/>${reference.length ? `<path d="${path(reference)}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="3 4" opacity=".6"/>` : ""}<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x(values.length - 1)}" cy="${y(values.at(-1))}" r="3.5" fill="var(--accent)" stroke="white" stroke-width="2"/></svg>`;
  }

  function employmentMix(rows) {
    const groups = [
      [
        "Active",
        rows.filter((row) => status(row) === "active").length,
        "#32967a",
      ],
      [
        "Departed",
        rows.filter((row) => status(row) === "departed").length,
        "#a8afbd",
      ],
      [
        "Upcoming",
        rows.filter((row) => status(row) === "upcoming").length,
        "#8b7bda",
      ],
    ];
    let left = 0;
    return `<div class="mini-chart-caption">Employment mix</div><svg class="sparkline mini-chart status-chart" viewBox="0 0 240 32" role="img" aria-label="${groups.map(([label, count]) => `${label}: ${count}`).join(", ")}">${groups
      .map(([label, count, color]) => {
        const width = (count / Math.max(rows.length, 1)) * 240;
        const result = `<rect x="${left}" y="10" width="${Math.max(0, width - 2)}" height="12" rx="3" fill="${color}"/>`;
        left += width;
        return result;
      })
      .join(
        "",
      )}</svg><div class="mini-legend">${groups.map(([label, count, color]) => `<span><i style="background:${color}"></i>${label === "Departed" ? "Left" : label} ${count}</span>`).join("")}</div>`;
  }

  function employeesByCountry(groups) {
    const totals = new Map();
    groups.forEach((group) =>
      totals.set(group.country, (totals.get(group.country) || 0) + group.count),
    );
    return miniBars(
      [...totals].sort((a, b) => b[1] - a[1]),
      "Employees by country",
    );
  }

  function scopeLabel(filters) {
    return [
      filters.country ? countryName(filters.country) : "All countries",
      filters.department || "All departments",
      filters.currency,
    ]
      .filter(Boolean)
      .map(escape)
      .join(" · ");
  }

  function groupSummary(groups, average = false) {
    return `<div class="group-totals" aria-label="Totals by country and currency">${groups.map((group) => `<div><span>${escape(countryName(group.country))} · ${escape(group.currency)}</span><strong>${money(group.total, group.currency)}</strong><small>${number(group.count)} employees${average ? ` · Avg ${money(group.total / group.count, group.currency)}` : ""}</small></div>`).join("")}</div>`;
  }

  function renderCommitment(filters) {
    const { groups } = filteredGroups(filters);
    if (!groups.length) return stateView("empty");
    const count = groups.reduce((sum, row) => sum + row.count, 0);
    const metrics = [["Active employees", number(count)]];
    if (groups.length === 1)
      metrics.push([
        `Annual base pay · ${groups[0].currency}`,
        compact(groups[0].total),
        amount(groups[0].total),
      ]);
    else
      metrics.push(
        ["Countries", new Set(groups.map((row) => row.country)).size],
        ["Currencies", new Set(groups.map((row) => row.currency)).size],
      );
    return {
      summary: `${overview(`${scopeLabel(filters)} · ${date(demo.asOf)}`, metrics, employeesByCountry(groups))}`,
      body: `<section class="card result-surface" aria-label="Salary commitment results">${table(
        ["Country", "Currency", "Employees", "Annual base pay"],
        slice(groups).map((row) => [
          country(row.country),
          row.currency,
          number(row.count),
          money(row.total, row.currency),
        ]),
        [2, 3],
      )}${pager(groups.length)}</section>`,
    };
  }

  function renderDepartments(filters) {
    const { rows, groups } = filteredGroups(filters);
    if (!rows.length) return stateView("empty");
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    const oneGroup = groups.length === 1;
    const metrics = [["Employees", number(count)]];
    if (oneGroup)
      metrics.push(
        [
          `Annual base pay · ${groups[0].currency}`,
          compact(groups[0].total),
          amount(groups[0].total),
        ],
        [
          `Average · ${groups[0].currency}`,
          compact(groups[0].total / count),
          amount(groups[0].total / count),
        ],
      );
    else
      metrics.push(
        ["Departments", new Set(rows.map((row) => row.department)).size],
        ["Countries", new Set(groups.map((row) => row.country)).size],
      );
    const shares = new Map();
    rows.forEach((row) =>
      shares.set(
        row.department,
        (shares.get(row.department) || 0) + (oneGroup ? row.total : row.count),
      ),
    );
    const shortNames = {
      Engineering: "Eng",
      Operations: "Ops",
      Finance: "Fin",
      People: "HR",
      Sales: "Sales",
    };
    const visual = miniBars(
      [...shares].map(([name, value]) => [shortNames[name], value]),
      oneGroup
        ? `Annual base pay · ${groups[0].currency}`
        : "Employees by department",
    );
    const columns = [
      ...(!filters.country ? [["Country", (row) => country(row.country)]] : []),
      ["Department", (row) => escape(row.department)],
      ...(!filters.currency ? [["Currency", (row) => row.currency]] : []),
      ["Employees", (row) => number(row.count), true],
      ["Annual base pay", (row) => money(row.total, row.currency), true],
      ["Average base pay", (row) => money(row.average, row.currency), true],
    ];
    const chart = oneGroup
      ? `<section class="report-chart"><h2>Department comparison</h2><div class="chart">${rows.map((row) => `<div class="bar-row"><span>${escape(row.department)}</span><div class="bar-track"><div class="bar-fill strong" style="width:${(row.total / Math.max(...rows.map((item) => item.total))) * 100}%"></div></div><span class="num">${compact(row.total)} ${row.currency}</span></div>`).join("")}</div></section>`
      : "";
    return {
      summary: `${overview(scopeLabel(filters), metrics, oneGroup ? "" : visual)}${!oneGroup ? groupSummary(groups, true) : ""}${chart}`,
      body: `<section class="card result-surface" aria-label="Department results">${table(
        columns.map((column) => column[0]),
        slice(rows).map((row) => columns.map((column) => column[1](row))),
        columns.flatMap((column, index) => (column[2] ? [index] : [])),
      )}${pager(rows.length)}</section>`,
    };
  }

  function growthRows(filters) {
    const groups = filteredGroups({ ...filters, currency: "" }).groups;
    const start = new Date(filters.from + "T00:00:00Z");
    start.setUTCDate(1);
    const end = new Date(filters.to + "T23:59:59Z");
    const rows = [];
    let index = 0;
    while (start <= end && index < 180) {
      const month = start.toISOString().slice(0, 7);
      groups.forEach((group) => {
        const review =
          group.country === "IN"
            ? 3
            : group.country === "CA"
              ? 6
              : group.country === "DE"
                ? 0
                : 3;
        const factor =
          start.getUTCMonth() === review
            ? 0.018
            : 0.002 + ((index + group.country.charCodeAt(0)) % 4) * 0.0007;
        const increases = Math.round(group.total * factor * 100) / 100;
        const decreases =
          Math.round(
            group.total *
              (group.country === "FR" && start.getUTCMonth() === 7
                ? 0.007
                : index % 4 === 0
                  ? 0.0004
                  : 0.0001) *
              100,
          ) / 100;
        rows.push({
          ...group,
          month,
          increases,
          decreases,
          net: increases - decreases,
          switches:
            group.country === "IN" &&
            group.currency === "USD" &&
            index % 3 === 0
              ? 1
              : 0,
        });
      });
      start.setUTCMonth(start.getUTCMonth() + 1);
      index++;
    }
    return rows.sort((a, b) =>
      (a.month + a.country + a.currency).localeCompare(
        b.month + b.country + b.currency,
      ),
    );
  }

  function renderGrowth(filters) {
    const rows = growthRows(filters);
    if (!rows.length) return stateView("empty");
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.country + row.currency;
      const group = groups.get(key) || {
        country: row.country,
        currency: row.currency,
        increases: 0,
        decreases: 0,
        net: 0,
        switches: 0,
      };
      for (const field of ["increases", "decreases", "net", "switches"])
        group[field] += row[field];
      groups.set(key, group);
    });
    const totals = [...groups.values()];
    const oneGroup = totals.length === 1;
    const metrics = oneGroup
      ? [
          [
            `Increases · ${totals[0].currency}`,
            compact(totals[0].increases),
            amount(totals[0].increases),
          ],
          [
            `Decreases · ${totals[0].currency}`,
            compact(totals[0].decreases),
            amount(totals[0].decreases),
          ],
          [
            `Net change · ${totals[0].currency}`,
            compact(totals[0].net),
            amount(totals[0].net),
          ],
          ["Currency switches", number(totals[0].switches)],
        ]
      : [
          ["Country/currency groups", totals.length],
          [
            "Currency switches",
            number(totals.reduce((sum, row) => sum + row.switches, 0)),
          ],
        ];
    const periodTotals = !oneGroup
      ? `<div class="group-totals period-summary" aria-label="Period totals by country and currency">${totals
          .map(
            (group) =>
              `<div><span>${escape(countryName(group.country))} · ${group.currency}</span><dl class="period-metrics">${[
                ["Increases", amount(group.increases)],
                ["Decreases", amount(group.decreases)],
                ["Net change", amount(group.net)],
                ["Currency switches", number(group.switches)],
              ]
                .map(
                  ([label, value]) =>
                    `<div><dt>${label}</dt><dd>${value}</dd></div>`,
                )
                .join("")}</dl></div>`,
          )
          .join("")}</div>`
      : "";
    const columns = [
      ["Month", (row) => row.month],
      ...(!filters.country ? [["Country", (row) => country(row.country)]] : []),
      ["Currency", (row) => row.currency],
      ["Increases", (row) => amount(row.increases), true],
      ["Decreases", (row) => amount(row.decreases), true],
      ["Net change", (row) => amount(row.net), true],
      ["Switches", (row) => number(row.switches), true],
    ];
    const charts = totals
      .map((group) => {
        const points = rows.filter(
          (row) =>
            row.country === group.country && row.currency === group.currency,
        );
        const visible = points.slice(-12);
        const max = Math.max(...visible.map((row) => Math.abs(row.net)), 1);
        return `<div class="chart"><h3>${escape(countryName(group.country))} · ${group.currency}</h3><div class="growth-bars" role="img" aria-label="Latest monthly net annual base pay changes in ${group.currency}">${visible.map((row) => `<div class="growth-slot"><div class="growth-bar ${row.net < 0 ? "negative" : ""}" style="height:${Math.max(2, (Math.abs(row.net) / max) * 70)}px" title="${row.month}: ${money(row.net, group.currency)}"></div><span>${row.month.slice(2)}</span></div>`).join("")}</div></div>`;
      })
      .join("");
    return {
      summary: `${overview(`${scopeLabel(filters)} · ${date(filters.from)} – ${date(filters.to)}`, metrics, "")}${periodTotals}<section class="report-chart"><h2>Net change trend <span>Latest 12 months</span></h2>${charts}</section>`,
      body: `<section class="card result-surface" aria-label="Monthly salary changes">${table(
        columns.map((column) => column[0]),
        slice(rows).map((row) => columns.map((column) => column[1](row))),
        columns.flatMap((column, index) => (column[2] ? [index] : [])),
      )}${pager(rows.length)}</section>`,
    };
  }

  function historicalRows(filters) {
    const departments = departmentRows().filter(
      (row) =>
        (!filters.country || row.country === filters.country) &&
        (!filters.department || row.department === filters.department) &&
        (!filters.currency || row.currency === filters.currency),
    );
    const start = new Date(filters.from + "-01T00:00:00Z");
    const end = new Date(filters.to + "T23:59:59Z");
    const rows = [];
    let index = 0;
    while (start <= end && index < 180) {
      const month = start.toISOString().slice(0, 7);
      const distance =
        (2026 - start.getUTCFullYear()) * 12 + 9 - start.getUTCMonth();
      const ratio = 1 / 1.005 ** Math.max(distance, 0);
      departments.forEach((group) => {
        const median = group.average * 0.97 * ratio;
        const reference = demo.commitment.find(
          (row) =>
            row.country === group.country && row.currency === group.currency,
        );
        const countryMedian =
          (reference.total / reference.count) * 0.94 * ratio;
        const count = Math.max(
          1,
          Math.round(group.count / 1.003 ** Math.max(distance, 0)),
        );
        rows.push({
          ...group,
          month,
          count,
          total: (median * count) / 0.97,
          median,
          p10: median * 0.78,
          p90: median * 1.24,
          countryMedian,
          gap: (median / countryMedian - 1) * 100,
          yoy: start.getUTCFullYear() < 2013 ? null : 6.17,
        });
      });
      start.setUTCMonth(start.getUTCMonth() + 1);
      index++;
    }
    return rows.sort((a, b) =>
      (a.month + a.country + a.department + a.currency).localeCompare(
        b.month + b.country + b.department + b.currency,
      ),
    );
  }

  function trendChart(points) {
    const subset = points.filter(
      (row) =>
        row.country === points[0].country &&
        row.currency === points[0].currency &&
        row.department === points[0].department,
    );
    const visible = subset.filter(
      (_, index) =>
        index % Math.max(1, Math.ceil(subset.length / 24)) === 0 ||
        index === subset.length - 1,
    );
    const width = 820,
      height = 210,
      left = 64,
      right = 32,
      top = 15,
      bottom = 35;
    const max = Math.max(...visible.map((row) => row.p90)) * 1.06;
    const min = Math.min(...visible.map((row) => row.p10)) * 0.92;
    const x = (index) =>
      left + (index / Math.max(visible.length - 1, 1)) * (width - left - right);
    const y = (value) =>
      top + ((max - value) / (max - min)) * (height - top - bottom);
    const path = (field) =>
      visible
        .map(
          (row, index) =>
            `${index ? "L" : "M"}${x(index).toFixed(1)},${y(row[field]).toFixed(1)}`,
        )
        .join(" ");
    const band =
      visible
        .map((row, index) => `${index ? "L" : "M"}${x(index)},${y(row.p90)}`)
        .join(" ") +
      visible
        .toReversed()
        .map((row, index) => `L${x(visible.length - index - 1)},${y(row.p10)}`)
        .join(" ") +
      " Z";
    return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Median salary trend with a P10 to P90 band and country median in ${points[0].currency}">${[
      0, 1, 2, 3,
    ]
      .map((index) => {
        const value = min + ((max - min) * index) / 3;
        return `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}" stroke="#edf1ef"/><text x="${left - 10}" y="${y(value) + 3}" text-anchor="end">${compact(value)}</text>`;
      })
      .join(
        "",
      )}<path d="${band}" fill="var(--accent-soft)"/><path d="${path("countryMedian")}" fill="none" stroke="#7390ba" stroke-width="2" stroke-dasharray="5 5"/><path d="${path("median")}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${visible.map((row, index) => ([0, 1, 2, 3, 4].map((part) => Math.round(((visible.length - 1) * part) / 4)).includes(index) ? `<text x="${x(index)}" y="${height - 10}" text-anchor="middle">${row.month}</text>` : "")).join("")}</svg>`;
  }

  function renderHistorical(filters) {
    const rows = historicalRows(filters);
    if (!rows.length) return stateView("empty");
    const lastMonth = rows.at(-1).month;
    const final = rows.filter((row) => row.month === lastMonth);
    const groups = new Map();
    final.forEach((row) => {
      const key = row.country + row.currency;
      const group = groups.get(key) || {
        country: row.country,
        currency: row.currency,
        count: 0,
        total: 0,
      };
      group.count += row.count;
      group.total += row.total;
      groups.set(key, group);
    });
    const summary = [...groups.values()];
    const count = final.reduce((sum, row) => sum + row.count, 0);
    const oneSeries =
      new Set(rows.map((row) => row.country + row.currency + row.department))
        .size === 1;
    const metrics = [["Employees", number(count)]];
    if (oneSeries)
      metrics.push([
        `Median · ${final[0].currency}`,
        compact(final[0].median),
        amount(final[0].median),
      ]);
    if (summary.length === 1)
      metrics.push([
        `Annual base pay · ${summary[0].currency}`,
        compact(summary[0].total),
        amount(summary[0].total),
      ]);
    else
      metrics.push(
        ["Countries", new Set(summary.map((row) => row.country)).size],
        ["Departments", new Set(final.map((row) => row.department)).size],
      );
    const monthlyCounts = new Map();
    rows.forEach((row) =>
      monthlyCounts.set(
        row.month,
        (monthlyCounts.get(row.month) || 0) + row.count,
      ),
    );
    const visual = oneSeries
      ? miniTrend(
          rows.map((row) => row.median),
          `Median vs country · ${rows[0].currency}`,
          rows.map((row) => row.countryMedian),
        )
      : miniTrend([...monthlyCounts.values()], "Employees at month end");
    const columns = [
      ["Month", (row) => row.month],
      ...(!filters.country ? [["Country", (row) => country(row.country)]] : []),
      ...(!filters.department
        ? [["Department", (row) => escape(row.department)]]
        : []),
      ...(!filters.currency ? [["Currency", (row) => row.currency]] : []),
      ["Median", (row) => amount(row.median), true],
      ["vs country", (row) => percent(row.gap), true],
      ["YoY", (row) => percent(row.yoy), true],
      ["Employees", (row) => number(row.count), true],
      ["Annual base pay", (row) => amount(row.total), true],
      ["P10", (row) => amount(row.p10), true],
      ["P90", (row) => amount(row.p90), true],
      ["Country median", (row) => amount(row.countryMedian), true],
    ];
    const trend = oneSeries
      ? `<section class="report-chart"><h2>Salary trend <span>${escape(countryName(rows[0].country))} · ${escape(rows[0].department)} · ${rows[0].currency}</span></h2><div class="chart">${trendChart(rows)}<div class="chart-legend"><span>Department median</span><span class="blue">Country median</span><span class="pale">P10–P90</span></div></div></section>`
      : "";
    return {
      summary: `${overview(`${scopeLabel(filters)} · Final snapshot ${date(filters.to)}`, metrics, oneSeries ? "" : visual)}${summary.length > 1 ? groupSummary(summary) : ""}${trend}`,
      body: `<section class="card result-surface" aria-label="Monthly salary benchmarks">${table(
        columns.map((column) => column[0]),
        slice(rows).map((row) => columns.map((column) => column[1](row))),
        columns.flatMap((column, index) => (column[2] ? [index] : [])),
        true,
      )}${pager(rows.length)}</section>`,
    };
  }

  function renderReport() {
    const form = document.querySelector("#report-filters");
    const filters = Object.fromEntries(new FormData(form));
    const target = document.querySelector("#report-body");
    const summary = document.querySelector("#report-overview");
    summary.innerHTML = "";
    if (viewState) {
      target.innerHTML = stateView(viewState);
      return;
    }
    const render = {
      "report-commitment": renderCommitment,
      "report-departments": renderDepartments,
      "report-growth": renderGrowth,
      "report-history": renderHistorical,
    }[page];
    const result = render(filters);
    if (typeof result === "string") target.innerHTML = result;
    else {
      summary.innerHTML = result.summary;
      target.innerHTML = result.body;
    }
  }

  document.addEventListener("click", (event) => {
    const paging = event.target.closest("[data-page]");
    if (paging && paging.tagName === "BUTTON") {
      currentPage = Number(paging.dataset.page);
      page === "employees" ? renderEmployees() : renderReport();
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "retry" || action === "reset-filters") {
      viewState = "";
      currentPage = 0;
      if (action === "reset-filters") {
        const form = document.querySelector(
          "#employee-filters, #report-filters",
        );
        if (page === "employees") form.reset();
        form
          .querySelectorAll("select")
          .forEach((select) => (select.value = ""));
      }
      page === "employees" ? renderEmployees() : renderReport();
    }
  });

  if (page === "employees") {
    const form = document.querySelector("#employee-filters");
    form.onsubmit = (event) => event.preventDefault();
    form.addEventListener("input", () => {
      viewState = "";
      currentPage = 0;
      renderEmployees();
    });
    renderEmployees();
  }
  if (page === "employee") renderProfile();
  if (page === "employee-new" || page === "employee-edit") setupEmployeeForm();
  if (page === "salary-change") setupSalaryForm();
  if (page.startsWith("report-")) {
    const form = document.querySelector("#report-filters");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const error = document.querySelector("#filter-error");
      if (values.from && values.from > values.to) {
        error.textContent = "Choose an end date on or after the start date.";
        error.hidden = false;
        return;
      }
      if (page === "report-history") {
        const from = new Date(values.from + "-01"),
          to = new Date(values.to);
        const months =
          (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
          to.getUTCMonth() -
          from.getUTCMonth() +
          1;
        if (months > 180) {
          error.textContent = "Select a period of up to 15 years (180 months).";
          error.hidden = false;
          return;
        }
      }
      error.hidden = true;
      viewState = "";
      currentPage = 0;
      renderReport();
    });
    form.addEventListener("reset", () =>
      setTimeout(() => {
        form
          .querySelectorAll("[data-value]")
          .forEach((select) => (select.value = select.dataset.value));
        viewState = "";
        currentPage = 0;
        document.querySelector("#filter-error").hidden = true;
        renderReport();
      }, 0),
    );
    renderReport();
  }
  if (page === "login") {
    const form = document.querySelector("#login-form");
    document.querySelector("#show-password").onclick = () => {
      const input = form.elements.password;
      input.type = input.type === "password" ? "text" : "password";
      document.querySelector("#show-password").textContent =
        input.type === "password" ? "Show" : "Hide";
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      if (
        form.elements.email.value !== "hr@example.com" ||
        form.elements.password.value !== "DemoSalary2026!"
      ) {
        document.querySelector("#login-error").hidden = false;
        return;
      }
      location.href = "employees.html";
    };
    if (viewState === "error")
      document.querySelector("#login-error").hidden = false;
  }
})();
