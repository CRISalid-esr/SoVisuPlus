import { useMemo } from 'react'
import { Autocomplete, FormHelperText, TextField } from '@mui/material'
import { t } from '@lingui/core/macro'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'

interface RoleMultiSelectProps {
  roles: LocRelator[]
  disabled?: boolean
  onChange: (roles: LocRelator[]) => void
}

const RoleMultiSelect = ({
  roles,
  disabled,
  onChange,
}: RoleMultiSelectProps) => {
  const options = useMemo(() => Object.values(LocRelator), [])

  const isDefaultOnly =
    roles.length === 1 && roles[0] === LocRelator.CONTRIBUTOR

  return (
    <>
      <Autocomplete
        multiple
        size='small'
        disabled={disabled}
        options={options}
        value={roles}
        getOptionLabel={(option) => LocRelatorHelper.toLabel(option)}
        onChange={(_event, value) => onChange(value)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t`documents_details_page_authors_tab_roles_label`}
            placeholder={t`documents_details_page_authors_tab_roles_placeholder`}
          />
        )}
      />
      {isDefaultOnly && (
        <FormHelperText sx={{ color: 'warning.main' }}>
          {t`documents_details_page_authors_tab_default_role_warning`}
        </FormHelperText>
      )}
    </>
  )
}

export default RoleMultiSelect
