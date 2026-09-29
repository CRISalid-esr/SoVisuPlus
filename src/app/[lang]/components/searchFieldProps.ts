/**
 * MUI TextField props limiting a search field to `maxLength` characters, so
 * the user never gets the API's 400. `autoComplete: 'off'` is kept because
 * `slotProps.htmlInput` replaces Material React Table's default input props.
 *
 * Lives here rather than beside the length checks in
 * `@/utils/fuzzySearch/searchQueryLength`: that module is shared with the
 * server and has no other view-layer dependency.
 */
export const searchFieldProps = (maxLength: number) => ({
  slotProps: {
    htmlInput: { autoComplete: 'off', maxLength },
  },
})
