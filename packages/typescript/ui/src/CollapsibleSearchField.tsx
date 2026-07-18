import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

/**
 * Props for the collapsible panel search field.
 */
export type CollapsibleSearchFieldProps = {
  /** Current search query text. */
  value: string;

  /**
   * Called when the user edits or clears the search query.
   *
   * @param value - Updated query text.
   */
  onChange: (value: string) => void;

  /** Placeholder shown when the field is expanded. */
  placeholder?: string;

  /** Accessible label for the search input. */
  ariaLabel?: string;
};

/**
 * Search field that stays collapsed to an icon until focused or filled.
 *
 * @param props - Controlled query value and change handler.
 * @returns Collapsible search control aligned to the right.
 */
export function CollapsibleSearchField({
  value,
  onChange,
  placeholder = "Search",
  ariaLabel = "Search",
}: CollapsibleSearchFieldProps) {
  // Expanded while focused or when a query is present.
  const [focused, setFocused] = useState(false);

  // Input to focus when expanding from the collapsed icon button.
  const inputRef = useRef<HTMLInputElement>(null);

  const expanded = focused || value.length > 0;

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  /**
   * Clear the query and keep the field expanded for another entry.
   */
  function handleClear(): void {
    onChange("");
  }

  if (!expanded) {
    return (
      <IconButton
        aria-label={ariaLabel}
        size="small"
        onClick={() => setFocused(true)}
        sx={{ flexShrink: 0 }}
      >
        <SearchIcon fontSize="small" />
      </IconButton>
    );
  }

  return (
    <TextField
      inputRef={inputRef}
      value={value}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      size="small"
      variant="outlined"
      sx={{
        flexShrink: 0,
        maxWidth: "100%",
        width: "min(160px, 100%)",
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment:
            value.length > 0 ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Clear search"
                  edge="end"
                  size="small"
                  onMouseDown={(event: MouseEvent<HTMLButtonElement>) =>
                    event.preventDefault()
                  }
                  onClick={handleClear}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
        },
      }}
    />
  );
}
