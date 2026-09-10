'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import {
  deleteHarmonyAttachment,
  formatHarmonyAttachmentSize,
  HARMONY_ATTACHMENT_ACCEPT,
  HARMONY_ATTACHMENT_MAX_FILES,
  listHarmonyAttachments,
  validateHarmonyAttachmentFile,
  type HarmonyAttachment,
  type HarmonyAttachmentEntityType,
  type LegacyAttachmentLink,
} from '@/lib/harmony-attachments'

export function HarmonyPendingAttachmentPicker({
  files,
  onChange,
  label = 'Dokumen Pendukung',
  description = 'Maksimal 3 file. File dapat dihapus sebelum pengajuan dikirim.',
  required = false,
  disabled = false,
  maxFiles = HARMONY_ATTACHMENT_MAX_FILES,
}: {
  files: File[]
  onChange: (files: File[]) => void
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  maxFiles?: number
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')

  function addFiles(incoming: FileList | null) {
    if (!incoming || disabled) return

    const next = [...files]

    for (const file of Array.from(incoming)) {
      const validation = validateHarmonyAttachmentFile(file)
      if (validation) {
        setError(validation)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const duplicate = next.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified,
      )

      if (!duplicate) next.push(file)
    }

    if (next.length > maxFiles) {
      setError(`Maksimal ${maxFiles} file tambahan pada kondisi saat ini.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setError('')
    onChange(next)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(index: number) {
    if (disabled) return
    onChange(files.filter((_, itemIndex) => itemIndex !== index))
    setError('')
  }

  return (
    <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Paperclip size={17} className="text-[#007aff]" />
            <h3 className="font-semibold text-[#1d1d1f]">
              {label}
              {required ? <span className="ml-1 text-red-500">*</span> : null}
            </h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{description}</p>
          <p className="mt-1 text-xs font-semibold text-[#86868b]">
            PDF/JPG/PNG/WEBP/DOC/DOCX/XLS/XLSX · maks. 10 MB/file · {files.length}/{maxFiles} file baru
          </p>
        </div>

        <label
          className={[
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-[#007aff] shadow-sm transition',
            disabled || files.length >= maxFiles
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:bg-[#e8f2ff]',
          ].join(' ')}
        >
          <Upload size={17} />
          Tambah File
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={HARMONY_ATTACHMENT_ACCEPT}
            className="hidden"
            disabled={disabled || files.length >= maxFiles}
            onChange={(event) => addFiles(event.target.files)}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      {files.length > 0 ? (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f2ff] text-[#007aff]">
                <FileText size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#1d1d1f]">{file.name}</p>
                <p className="mt-0.5 text-[11px] text-[#86868b]">
                  {formatHarmonyAttachmentSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                title="Hapus file sebelum submit"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-white/70 px-4 py-3 text-xs text-[#86868b]">
          Belum ada dokumen dipilih.
        </div>
      )}
    </div>
  )
}

function mergeLegacyLinks(
  attachments: HarmonyAttachment[],
  legacyLinks: LegacyAttachmentLink[],
) {
  const result = [...attachments]
  const urls = new Set(result.map((item) => item.file_url))

  legacyLinks.forEach((legacy, index) => {
    const url = String(legacy.url || '').trim()
    if (!url || urls.has(url)) return

    result.push({
      id: `legacy-${index}-${url}`,
      entity_type: 'attendance_log',
      entity_id: '',
      owner_employee_id: null,
      slot_no: result.length + 1,
      attachment_kind: 'legacy',
      file_url: url,
      file_name: String(legacy.name || 'Dokumen Pendukung'),
      file_size: Number(legacy.size || 0) || null,
      file_type: String(legacy.type || '') || null,
      storage_bucket: 'leave-attachments',
      storage_path: String(legacy.storagePath || '') || null,
      is_legacy: true,
      created_at: '',
    })
    urls.add(url)
  })

  return result.slice(0, HARMONY_ATTACHMENT_MAX_FILES)
}

export function HarmonyAttachmentViewer({
  entityType,
  entityId,
  legacyLinks = [],
  compact = false,
  editable = false,
  emptyText = 'Tidak ada dokumen pendukung',
  onDeleted,
}: {
  entityType: HarmonyAttachmentEntityType
  entityId: string
  legacyLinks?: LegacyAttachmentLink[]
  compact?: boolean
  editable?: boolean
  emptyText?: string
  onDeleted?: () => void
}) {
  const [attachments, setAttachments] = useState<HarmonyAttachment[]>([])
  const [loading, setLoading] = useState(Boolean(entityId))
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      if (!entityId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const rows = await listHarmonyAttachments(entityType, entityId)
        if (active) setAttachments(rows)
      } catch (loadError: any) {
        if (active) {
          setAttachments([])
          setError(loadError?.message || 'Lampiran belum dapat dimuat.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [entityId, entityType])

  const visibleAttachments = useMemo(
    () => mergeLegacyLinks(attachments, legacyLinks),
    [attachments, legacyLinks],
  )

  async function handleDelete(attachment: HarmonyAttachment) {
    if (!editable || attachment.id.startsWith('legacy-')) return

    const confirmed = window.confirm(`Hapus dokumen "${attachment.file_name}"?`)
    if (!confirmed) return

    setDeletingId(attachment.id)
    setError('')

    try {
      await deleteHarmonyAttachment(attachment.id)
      setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))
      onDeleted?.()
    } catch (deleteError: any) {
      setError(deleteError?.message || 'Lampiran gagal dihapus.')
    } finally {
      setDeletingId('')
    }
  }

  if (loading && visibleAttachments.length === 0) {
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#86868b]">
        <Loader2 size={13} className="animate-spin" />
        Memuat dokumen...
      </span>
    )
  }

  if (visibleAttachments.length === 0) {
    return (
      <div>
        <span className="text-xs font-semibold text-[#86868b]">{emptyText}</span>
        {error ? <p className="mt-1 text-[11px] text-orange-600">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {visibleAttachments.map((attachment, index) => (
        <div
          key={`${attachment.id}-${attachment.file_url}`}
          className={[
            'flex items-center gap-2 rounded-xl border border-black/5 bg-[#f5f5f7]/70',
            compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
          ].join(' ')}
        >
          <FileText size={compact ? 13 : 15} className="shrink-0 text-[#007aff]" />
          <a
            href={attachment.file_url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-xs font-bold text-[#007aff] hover:underline"
            title={attachment.file_name}
          >
            {index + 1}. {attachment.file_name}
          </a>
          <ExternalLink size={11} className="shrink-0 text-[#86868b]" />
          {editable && !attachment.id.startsWith('legacy-') ? (
            <button
              type="button"
              onClick={() => handleDelete(attachment)}
              disabled={Boolean(deletingId)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              title="Hapus dokumen"
            >
              {deletingId === attachment.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
            </button>
          ) : null}
        </div>
      ))}

      {error ? <p className="text-[11px] text-orange-600">{error}</p> : null}
    </div>
  )
}
