import Autocomplete from "@mui/material/Autocomplete";
import { FormTextField } from "@roborean/ui";

/**
 * Props for the filterable variable-key picker.
 */
export type VariableKeyFieldProps = {
  /** Field label. */
  label?: string;

  /** Currently selected variable key. */
  value: string;

  /** Available workspace variable keys. */
  options: string[];

  /**
   * Called when the selected or typed key changes.
   *
   * @param next - Updated variable key.
   */
  onChange: (next: string) => void;

  /**
   * When true, allow keys that are not in `options`.
   */
  freeSolo?: boolean;
};

/**
 * Autocomplete field for choosing a workspace variable key by typing to filter.
 *
 * @param props - Label, value, options, and change handler.
 * @returns Filterable variable-key control.
 */
export function VariableKeyField({
  label = "Variable key",
  value,
  options,
  onChange,
  freeSolo = false,
}: VariableKeyFieldProps) {
  return (
    <Autocomplete
      size="small"
      options={options}
      value={value}
      freeSolo={freeSolo}
      autoHighlight
      clearOnBlur={false}
      onChange={(_event, next) => {
        onChange(typeof next === "string" ? next : (next ?? ""));
      }}
      onInputChange={(_event, next, reason) => {
        // Keep free-text edits in sync while filtering or typing.
        if (freeSolo && reason === "input") {
          onChange(next);
        }
      }}
      renderInput={(params) => (
        <FormTextField {...params} label={label} size="small" />
      )}
    />
  );
}
