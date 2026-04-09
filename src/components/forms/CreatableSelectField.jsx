import { useEffect, useMemo, useRef, useState } from "react";

function normalizeOptionEntries(options) {
  const map = new Map();

  (options || []).forEach((item) => {
    if (typeof item === "string") {
      const value = item.trim();
      if (value) {
        map.set(value.toLowerCase(), { value, label: value });
      }
      return;
    }

    const value = String(item?.value ?? "").trim();
    const label = String(item?.label ?? value).trim();

    if (value) {
      map.set(value.toLowerCase(), { value, label });
    }
  });

  return Array.from(map.values());
}

function matchesCustomOption(optionValue, customOptions) {
  return (customOptions || []).some(
    (item) => String(item || "").trim().toLowerCase() === optionValue.toLowerCase()
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function CreatableSelectField({
  label,
  name,
  value,
  onChangeValue,
  options,
  customOptions = [],
  onAddOption,
  onRemoveOption,
  placeholder,
  helperText,
  required = false,
  disabled = false,
  allowCreate = true,
  onBlur,
}) {
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);

  const normalizedValue = String(value ?? "");
  const trimmedValue = normalizedValue.trim();
  const normalizedOptions = useMemo(() => normalizeOptionEntries(options), [options]);

  const filteredOptions = useMemo(() => {
    const search = trimmedValue.toLowerCase();

    if (!search) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) => {
      return (
        option.label.toLowerCase().includes(search) ||
        option.value.toLowerCase().includes(search)
      );
    });
  }, [normalizedOptions, trimmedValue]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedValue) {
      return false;
    }

    return normalizedOptions.some(
      (option) => option.value.toLowerCase() === trimmedValue.toLowerCase()
    );
  }, [normalizedOptions, trimmedValue]);

  const canCreate = Boolean(
    allowCreate && onAddOption && trimmedValue && !hasExactMatch
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (event) => {
    onChangeValue(event.target.value);
    setOpen(true);
  };

  const handleSelectOption = (nextValue) => {
    onChangeValue(nextValue);
    setOpen(false);
  };

  const handleCreateOption = () => {
    if (!canCreate) {
      return;
    }

    onAddOption(trimmedValue);
    onChangeValue(trimmedValue);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      setOpen(true);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (canCreate) {
        handleCreateOption();
        return;
      }

      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0].value);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label ? (
        <label htmlFor={name} className="label-base">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          className="input-base pr-10"
          value={normalizedValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => {
            if (disabled) {
              return;
            }

            setOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition-colors duration-200 hover:text-slate-700 dark:text-[#888888] dark:hover:text-[#E0E0E0]"
          tabIndex={-1}
        >
          <ChevronIcon open={open} />
        </button>
      </div>

      {helperText ? (
        <p className="mt-2 text-xs text-slate-500 transition-colors duration-300 dark:text-[#888888]">
          {helperText}
        </p>
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl transition-colors duration-300 dark:border-[#444444] dark:bg-[#121212]">
          {filteredOptions.length > 0 ? (
            <div className="space-y-1">
              {filteredOptions.map((option) => {
                const isCustom = matchesCustomOption(option.value, customOptions);
                const isSelected = option.value === normalizedValue;

                return (
                  <div
                    key={option.value}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors duration-200 ${
                      isSelected
                        ? "bg-slate-100 dark:bg-[#1A1A1A]"
                        : "hover:bg-slate-50 dark:hover:bg-[#181818]"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left text-sm text-slate-700 dark:text-[#E0E0E0]"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectOption(option.value)}
                    >
                      <span className="block truncate font-medium">{option.label}</span>
                    </button>

                    {isCustom && onRemoveOption ? (
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-[#444444] dark:text-[#888888] dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveOption(option.value);
                        }}
                        aria-label={`Eliminar opción ${option.label}`}
                        title="Eliminar opción"
                      >
                        <CloseIcon />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {canCreate ? (
            <button
              type="button"
              className="mt-1 flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-200 hover:border-slate-900 hover:bg-slate-50 dark:border-[#444444] dark:text-[#E0E0E0] dark:hover:border-[#E0E0E0] dark:hover:bg-[#181818]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleCreateOption}
            >
              <span className="truncate">Agregar “{trimmedValue}”</span>
              <span className="text-xs text-slate-500 dark:text-[#888888]">Enter</span>
            </button>
          ) : null}

          {!filteredOptions.length && !canCreate ? (
            <p className="px-3 py-2 text-sm text-slate-500 dark:text-[#888888]">
              No hay opciones disponibles.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default CreatableSelectField;
