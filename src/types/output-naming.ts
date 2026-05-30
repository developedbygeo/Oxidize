/**
 * User-controlled output naming. Mirrors `OutputNaming` on the Rust side.
 * Both fields are optional and default to the historical behaviour
 * (`{name}_{op}` template + auto-number on collision).
 */

export type OverwriteMode = 'auto-number' | 'skip' | 'overwrite';

export const DEFAULT_FILENAME_TEMPLATE = '{name}_{op}';
export const DEFAULT_OVERWRITE_MODE: OverwriteMode = 'auto-number';

export type OutputNaming = {
  filename_template: string | null;
  overwrite_mode: OverwriteMode | null;
};

/** Build the snake-case shape the Rust commands expect. */
export const toOutputNaming = (
  template: string | null | undefined,
  mode: OverwriteMode | null | undefined
): OutputNaming | null => {
  const cleanedTemplate =
    typeof template === 'string' && template.trim().length > 0 ? template.trim() : null;
  const cleanedMode = mode && mode !== DEFAULT_OVERWRITE_MODE ? mode : null;
  if (!cleanedTemplate && !cleanedMode) return null;
  return {
    filename_template: cleanedTemplate,
    overwrite_mode: cleanedMode,
  };
};
