/* eslint-disable react/jsx-filename-extension */
import { Components, Theme } from '@mui/material/styles'
import merge from 'lodash/merge'

import Select from './Select'
import Divider from './Divider'
import Button from './Button'
import Badge from './Badge'

export default function ComponentsOverrides(theme: Theme) {
  return merge(
    Select(theme),
    Button(theme) as unknown as Components,
    Divider(theme),
    Badge(),
  )
}
