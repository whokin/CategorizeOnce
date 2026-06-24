/*
 * Copyright 2025 Junlin Shang
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  getMappingRulesFromLocalStorage,
  setMappingRulesToLocalStorage,
  clearMappingRulesFromLocalStorage,
} from "../utils/mappingRules";
import { Link } from "@tanstack/react-router";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import Papa from "papaparse";
import Notification from "../components/Notification";
import AlertModal from "../components/AlertModal";
import {
  ArrowDownOnSquareIcon,
  DocumentPlusIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";

export const Route = createFileRoute("/mappingrules")({
  component: RouteMappingRulesComponent,
});

function SortIcon({ colKey, sortConfig }) {
  const isPrimary = sortConfig.primary.key === colKey;
  const isSecondary = sortConfig.secondary?.key === colKey;
  if (!isPrimary && !isSecondary)
    return <span className="ml-1 text-xs opacity-25">↕</span>;
  const dir = isPrimary ? sortConfig.primary.dir : sortConfig.secondary.dir;
  return (
    <span
      className={`ml-1 text-xs ${
        isPrimary
          ? "font-bold text-indigo-600 dark:text-indigo-400"
          : "text-indigo-400 dark:text-indigo-500"
      }`}
    >
      {dir === "asc" ? "↑" : "↓"}
      {isSecondary && <sup className="text-[9px]">2</sup>}
    </span>
  );
}

function RouteMappingRulesComponent() {
  const [rules, setRules] = useState(() => {
    try {
      const obj = getMappingRulesFromLocalStorage();
      return Object.entries(obj).map(([payee, category]) => ({
        payee,
        category,
      }));
    } catch {
      return [];
    }
  });

  const [sortConfig, setSortConfig] = useState({
    primary: { key: "payee", dir: "asc" },
    secondary: null,
  });

  const [payeeFilter, setPayeeFilter] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef(null);

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  const [showNotification, setShowNotification] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showAlertModal, setShowAlertModal] = useState(false);

  const allCategories = useMemo(
    () => [...new Set(rules.map((r) => r.category))].sort(),
    [rules]
  );

  const filteredCategoryOptions = useMemo(
    () =>
      allCategories.filter((c) =>
        c.toLowerCase().includes(categorySearch.toLowerCase())
      ),
    [allCategories, categorySearch]
  );

  const displayed = useMemo(() => {
    const filtered = rules
      .filter((r) =>
        r.payee.toLowerCase().includes(payeeFilter.toLowerCase())
      )
      .filter(
        (r) =>
          selectedCategories.length === 0 ||
          selectedCategories.includes(r.category)
      );
    return [...filtered].sort((a, b) => {
      const { primary, secondary } = sortConfig;
      const cmp = (key, dir) => {
        const v = (a[key] || "").localeCompare(b[key] || "");
        return dir === "asc" ? v : -v;
      };
      const p = cmp(primary.key, primary.dir);
      if (p !== 0 || !secondary) return p;
      return cmp(secondary.key, secondary.dir);
    });
  }, [rules, payeeFilter, selectedCategories, sortConfig]);

  useEffect(() => {
    function onOutside(e) {
      if (
        catDropdownRef.current &&
        !catDropdownRef.current.contains(e.target)
      ) {
        setCatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function persistRules(newRules) {
    const obj = Object.fromEntries(newRules.map((r) => [r.payee, r.category]));
    setMappingRulesToLocalStorage(obj);
    setRules(newRules);
  }

  function handleHeaderClick(key, e) {
    if (e.shiftKey) {
      setSortConfig((prev) => {
        if (prev.primary.key === key) return prev;
        return {
          primary: prev.primary,
          secondary:
            prev.secondary?.key === key
              ? { key, dir: prev.secondary.dir === "asc" ? "desc" : "asc" }
              : { key, dir: "asc" },
        };
      });
    } else {
      setSortConfig((prev) => ({
        primary:
          prev.primary.key === key
            ? { key, dir: prev.primary.dir === "asc" ? "desc" : "asc" }
            : { key, dir: "asc" },
        secondary: null,
      }));
    }
  }

  function startEdit(rule, field) {
    setEditingCell({ payee: rule.payee, field });
    setEditValue(field === "payee" ? rule.payee : rule.category);
    setEditError("");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
    setEditError("");
  }

  function commitCategoryEdit(payee, newCategory) {
    persistRules(
      rules.map((r) => (r.payee === payee ? { ...r, category: newCategory } : r))
    );
    cancelEdit();
  }

  function commitPayeeEdit(originalPayee) {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === originalPayee) {
      cancelEdit();
      return;
    }
    if (rules.some((r) => r.payee === trimmed && r.payee !== originalPayee)) {
      setEditError(`A rule for "${trimmed}" already exists.`);
      return;
    }
    persistRules(
      rules.map((r) =>
        r.payee === originalPayee ? { ...r, payee: trimmed } : r
      )
    );
    cancelEdit();
  }

  function deleteRule(payee) {
    persistRules(rules.filter((r) => r.payee !== payee));
    if (editingCell?.payee === payee) cancelEdit();
  }

  function handleClearAll() {
    clearMappingRulesFromLocalStorage();
    setRules([]);
    setShowAlertModal(false);
  }

  function handleDownloadMappingRules() {
    const toBeExported = rules.map((r) => ({
      "payee/payer": r.payee,
      category: r.category,
    }));
    const csv = Papa.unparse(toBeExported);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapping-rules.csv";
    a.click();
    URL.revokeObjectURL(url);
    setNotificationTitle("Mapping rules downloaded.");
    setNotificationMessage("A CSV file has been downloaded to your device.");
    setShowNotification(true);
  }

  return (
    <div className="py-10">
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Mapping Rules
        </h1>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Description and Manage menu */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              CategorizeOnce creates mapping rules for payers and payees as you
              categorize them.
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              If you have old files that were categorized before, CategorizeOnce
              can also{" "}
              <Link
                to="/importrules"
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                extract rules from them
              </Link>
              .
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <Menu as="div" className="relative inline-block">
              <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20">
                Manage
                <ChevronDownIcon
                  aria-hidden="true"
                  className="-mr-1 size-5 text-gray-400"
                />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg outline-1 outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:divide-white/10 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
              >
                <div className="py-1">
                  <MenuItem>
                    <Link
                      to="/importrules"
                      className="group flex items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5 dark:data-focus:text-white"
                    >
                      <DocumentPlusIcon
                        aria-hidden="true"
                        className="mr-3 size-5 text-gray-400 group-data-focus:text-gray-500 dark:text-gray-500 dark:group-data-focus:text-white"
                      />
                      Import rules
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={handleDownloadMappingRules}
                      className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5 dark:data-focus:text-white"
                    >
                      <ArrowDownOnSquareIcon
                        aria-hidden="true"
                        className="mr-3 size-5 text-gray-400 group-data-focus:text-gray-500 dark:text-gray-500 dark:group-data-focus:text-white"
                      />
                      Download rules
                    </button>
                  </MenuItem>
                </div>
                <div className="py-1">
                  <MenuItem>
                    <button
                      onClick={() => setShowAlertModal(true)}
                      className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5 dark:data-focus:text-white"
                    >
                      <TrashIcon
                        aria-hidden="true"
                        className="mr-3 size-5 text-gray-400 group-data-focus:text-gray-500 dark:text-gray-500 dark:group-data-focus:text-white"
                      />
                      Clear all rules
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </Menu>
          </div>
        </div>

        {/* Table */}
        {rules.length > 0 && (
          <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="min-w-full px-6 py-2 align-middle sm:inline-block lg:px-8">
                <table className="relative min-w-full divide-y divide-gray-300 dark:divide-white/15">
                  <thead>
                    <tr className="align-top">
                      {/* Payee/Payer column */}
                      <th className="px-3 py-3.5 text-left w-1/2">
                        <button
                          onClick={(e) => handleHeaderClick("payee", e)}
                          className="flex items-center text-sm font-semibold text-gray-900 hover:text-indigo-600 select-none dark:text-white dark:hover:text-indigo-400"
                          title="Click to sort ascending/descending · Shift+Click to set as secondary sort"
                        >
                          Payee/Payer
                          <SortIcon colKey="payee" sortConfig={sortConfig} />
                        </button>
                        <input
                          type="text"
                          value={payeeFilter}
                          onChange={(e) => setPayeeFilter(e.target.value)}
                          placeholder="Search payee..."
                          className="mt-1.5 w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                        />
                      </th>

                      {/* Category column */}
                      <th className="px-3 py-3.5 text-left w-1/2">
                        <button
                          onClick={(e) => handleHeaderClick("category", e)}
                          className="flex items-center text-sm font-semibold text-gray-900 hover:text-indigo-600 select-none dark:text-white dark:hover:text-indigo-400"
                          title="Click to sort ascending/descending · Shift+Click to set as secondary sort"
                        >
                          Category
                          <SortIcon colKey="category" sortConfig={sortConfig} />
                        </button>
                        <div className="relative mt-1.5" ref={catDropdownRef}>
                          <input
                            type="text"
                            value={categorySearch}
                            onChange={(e) => setCategorySearch(e.target.value)}
                            onFocus={() => setCatDropdownOpen(true)}
                            placeholder={
                              selectedCategories.length > 0
                                ? `${selectedCategories.length} selected`
                                : "Search categories..."
                            }
                            className={`w-full rounded-md border px-2.5 py-1.5 text-xs shadow-sm focus:ring-1 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 ${
                              selectedCategories.length > 0
                                ? "border-indigo-300 bg-indigo-50 placeholder-indigo-400 focus:border-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-700"
                                : "border-gray-300 bg-white focus:border-indigo-500"
                            }`}
                          />
                          {catDropdownOpen && (
                            <div className="absolute left-0 top-full z-30 mt-0.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                              {filteredCategoryOptions.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-gray-400">
                                  No categories match.
                                </p>
                              ) : (
                                <div className="max-h-52 overflow-y-auto">
                                  {filteredCategoryOptions.map((cat) => (
                                    <label
                                      key={cat}
                                      className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(
                                          cat
                                        )}
                                        onChange={() =>
                                          setSelectedCategories((prev) =>
                                            prev.includes(cat)
                                              ? prev.filter((c) => c !== cat)
                                              : [...prev, cat]
                                          )
                                        }
                                        className="rounded border-gray-300 text-indigo-600"
                                      />
                                      <span className="text-xs text-gray-700 dark:text-gray-300">
                                        {cat}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {selectedCategories.length > 0 && (
                                <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-700">
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedCategories([]);
                                      setCategorySearch("");
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                                  >
                                    Clear all
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedCategories.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {selectedCategories.map((cat) => (
                              <span
                                key={cat}
                                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                              >
                                {cat.split("::").pop()}
                                <button
                                  onClick={() =>
                                    setSelectedCategories((prev) =>
                                      prev.filter((c) => c !== cat)
                                    )
                                  }
                                  className="hover:text-indigo-900"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </th>

                      <th className="w-10 px-3 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {displayed.map((rule) => (
                      <tr
                        key={rule.payee}
                        className="group hover:bg-gray-50 dark:hover:bg-white/5"
                      >
                        {/* Payee cell */}
                        <td className="px-3 py-3 text-sm">
                          {editingCell?.payee === rule.payee &&
                          editingCell.field === "payee" ? (
                            <div>
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value);
                                  setEditError("");
                                }}
                                onBlur={() => commitPayeeEdit(rule.payee)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    commitPayeeEdit(rule.payee);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                className={`w-full rounded-md border px-2 py-0.5 text-sm shadow-sm focus:ring-2 dark:bg-gray-800 dark:text-white ${
                                  editError
                                    ? "border-red-400 focus:ring-red-300"
                                    : "border-indigo-400 focus:ring-indigo-500"
                                }`}
                              />
                              {editError && (
                                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                                  {editError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(rule, "payee")}
                              className="w-full rounded px-1.5 py-0.5 text-left text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                              title="Click to edit"
                            >
                              {rule.payee}
                            </button>
                          )}
                        </td>

                        {/* Category cell */}
                        <td className="px-3 py-3 text-sm">
                          {editingCell?.payee === rule.payee &&
                          editingCell.field === "category" ? (
                            <select
                              autoFocus
                              value={editValue}
                              onChange={(e) =>
                                commitCategoryEdit(rule.payee, e.target.value)
                              }
                              onBlur={() => cancelEdit()}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="w-full rounded-md border border-indigo-400 px-2 py-0.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                            >
                              {allCategories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => startEdit(rule, "category")}
                              className="w-full rounded px-1.5 py-0.5 text-left text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-400 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                              title="Click to edit"
                            >
                              {rule.category}
                            </button>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="px-3 py-3 w-10">
                          <button
                            onClick={() => deleteRule(rule.payee)}
                            className="text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                            title="Delete rule"
                          >
                            <svg
                              className="size-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {displayed.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-10 text-center text-sm text-gray-400"
                        >
                          No rules match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {displayed.length < rules.length && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
                    Showing {displayed.length} of {rules.length} rules
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Notification
        title={notificationTitle}
        message={notificationMessage}
        showNotification={showNotification}
        setShowNotification={setShowNotification}
      />
      <AlertModal
        title="Clear all mapping rules"
        message="Are you sure you want to delete all mapping rules? This action cannot be undone."
        open={showAlertModal}
        actionText="Delete"
        action={handleClearAll}
        closeModal={() => setShowAlertModal(false)}
      />
    </div>
  );
}
