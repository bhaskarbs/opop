import { useRef } from 'react'

interface FileDropInputProps {
  label: string
  placeholder: string
  hint: string
  value?: File
  onChange: (file: File | undefined) => void
  accept?: string
}

export function FileDropInput({
  label,
  placeholder,
  hint,
  value,
  onChange,
  accept,
}: FileDropInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <label className="mb-2 block text-[13px] font-bold text-ink">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border-[1.5px] border-dashed border-[#C7CCD6] p-6 text-center"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8891A0"
          strokeWidth={1.8}
          className="mx-auto mb-2"
        >
          <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
        </svg>
        <div className="mb-0.5 text-[13.5px] font-semibold text-ink">
          {value ? value.name : placeholder}
        </div>
        <div className="text-[12.5px] text-fog">{hint}</div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </div>
  )
}
