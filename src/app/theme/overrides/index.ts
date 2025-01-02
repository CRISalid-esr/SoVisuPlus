/* eslint-disable react/jsx-filename-extension */
import { Components, Theme } from '@mui/material/styles'
import merge from 'lodash/merge'

import Select from './Select'
import Divider from './Divider'
import Button from './Button'
import Badge from './Badge'
import Tab from './Tab'
import Tabs from './Tabs'

export default function ComponentsOverrides(theme: Theme) {
  return merge(
    Select(theme),
    Button(theme) as unknown as Components,
    Divider(theme),
    Tab(),
    Tabs(theme),
    Badge(),
  )
}
