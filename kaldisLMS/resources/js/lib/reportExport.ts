function escapeCsv(value: string | number): string {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsv).join(','))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function downloadExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.join('\t'))
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'application/vnd.ms-excel' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function printReport(title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  const w = window.open('', '_blank')
  if (!w) return

  const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>`
  const tbody = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')

  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #2b1a10; }
    h1 { font-size: 18px; margin: 0 0 2px; color: #5a3618; }
    p { font-size: 12px; color: #6b5645; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d8cdbf; padding: 6px 8px; text-align: left; }
    th { background: #f2e9dc; color: #5a3618; }
    @media print { body { padding: 0; } }
  </style></head><body>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
  </body></html>`)
  w.document.close()
  setTimeout(() => w.print(), 400)
}
