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

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import CsvDropZone from "../CsvDropZone";

const PREVIEW_ROW_COUNT = 10;

export default function ImportStatement({
  setCsvData,
  setCsvColumns,
  isNewUser,
  setFileName,
  nextStep,
}) {
  const [rawRows, setRawRows] = useState(null);
  const [parsedFileName, setParsedFileName] = useState("");
  const [headerIdx, setHeaderIdx] = useState(null);

  function handleCSVParseComplete(results) {
    setRawRows(results.data);
  }

  function handleFileNameChange(name) {
    setParsedFileName(name);
    setFileName(name);
  }

  function handleConfirm() {
    const fields = rawRows[headerIdx].map((f) => String(f).trim());
    const dataRows = rawRows
      .slice(headerIdx + 1)
      .filter((r) => r.some((c) => String(c).trim()));
    const data = dataRows.map((row, index) => {
      const obj = { CO_id: index, CO_category: "" };
      fields.forEach((field, j) => {
        if (field) obj[field] = row[j] ?? "";
      });
      return obj;
    });
    setCsvData(data);
    setCsvColumns(fields.filter(Boolean));
    nextStep();
  }

  const previewRows = rawRows ? rawRows.slice(0, PREVIEW_ROW_COUNT) : [];

  return (
    <>
      {/* Quick Start Tips — only shown before a file is loaded */}
      {!rawRows && (
        <div
          className={`${!isNewUser ? "hidden" : ""} bg-white shadow-sm sm:rounded-lg dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10`}
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              You don&apos;t have to start from scratch
            </h3>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              <p>
                If you have previously categorized statements, CategorizeOnce
                can extract mapping rules from them to give you a head start.
              </p>
            </div>
            <div className="mt-3 text-sm/6">
              <Link
                to="/importrules"
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Import rules from my old files
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* File Drop Zone — shown before file is parsed */}
      {!rawRows && (
        <CsvDropZone
          rawMode
          handleCSVParseComplete={handleCSVParseComplete}
          setFileName={handleFileNameChange}
        />
      )}

      {/* Header Row Preview — shown after file is parsed */}
      {rawRows && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click the row that contains your column headers
            </p>
            <button
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => {
                setRawRows(null);
                setHeaderIdx(null);
              }}
            >
              ← Different file
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
              <tbody>
                {previewRows.map((row, i) => {
                  const isHeader = i === headerIdx;
                  const isSkipped = headerIdx !== null && i < headerIdx;
                  return (
                    <tr
                      key={i}
                      onClick={() => setHeaderIdx(i)}
                      className={[
                        "cursor-pointer border-b border-gray-100 last:border-0 transition-colors dark:border-gray-800",
                        isHeader ? "bg-indigo-50 dark:bg-indigo-900/20" : "",
                        isSkipped ? "opacity-40" : "",
                        !isHeader && !isSkipped
                          ? "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                          : "",
                      ].join(" ")}
                    >
                      <td className="w-6 py-2 pl-3 pr-1 text-center font-mono text-gray-400 select-none">
                        {i + 1}
                      </td>
                      <td className="w-20 px-2 py-1.5">
                        {isHeader && (
                          <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Header
                          </span>
                        )}
                        {isSkipped && (
                          <span className="rounded bg-gray-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            Skip
                          </span>
                        )}
                      </td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={[
                            "max-w-36 truncate px-3 py-2",
                            isHeader
                              ? "font-semibold text-indigo-900 dark:text-indigo-200"
                              : "text-gray-700 dark:text-gray-300",
                            isSkipped
                              ? "line-through text-gray-400"
                              : "",
                          ].join(" ")}
                        >
                          {String(cell) || (
                            <span className="italic text-gray-300">empty</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {headerIdx !== null ? (
            <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3 dark:bg-indigo-900/20">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {headerIdx > 0 && (
                  <>
                    Skipping <strong>{headerIdx}</strong>{" "}
                    {headerIdx === 1 ? "row" : "rows"} ·{" "}
                  </>
                )}
                <strong>{rawRows.length - headerIdx - 1}</strong> transactions
              </p>
              <button
                onClick={handleConfirm}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                Use row {headerIdx + 1} as header →
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 dark:text-gray-600">
              {previewRows.length} rows shown · click one to set as header
            </p>
          )}
        </div>
      )}
    </>
  );
}
