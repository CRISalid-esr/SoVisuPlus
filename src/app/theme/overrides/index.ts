/* eslint-disable react/jsx-filename-extension */
import { Theme } from "@mui/material/styles";
import merge from "lodash/merge"

import Select from "./Select"
import Divider from "./Divider"

export default function ComponentsOverrides(theme: Theme) {
    return merge(
        Select(theme),
        Divider(theme)
    )
}
