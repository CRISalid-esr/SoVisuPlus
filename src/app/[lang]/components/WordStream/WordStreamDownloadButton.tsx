'use client'

import { RefObject, useState } from 'react'
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { t } from '@lingui/core/macro'
import { downloadPng, downloadSvg } from '@/app/utils/svgExport'

type WordStreamDownloadButtonProps = {
  svgRef: RefObject<SVGSVGElement | null>
  filename: string
  disabled?: boolean
}

const WordStreamDownloadButton = ({
  svgRef,
  filename,
  disabled = false,
}: WordStreamDownloadButtonProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleDownload = async (format: 'png' | 'svg') => {
    setAnchorEl(null)
    const svg = svgRef.current
    if (!svg) return
    try {
      if (format === 'png') await downloadPng(svg, filename)
      else downloadSvg(svg, filename)
    } catch (error) {
      console.error('Error while downloading the wordstream', error)
    }
  }

  return (
    <>
      <Tooltip title={t`wordstream_download_button_tooltip`}>
        <span>
          <IconButton
            aria-label={t`wordstream_download_button_tooltip`}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            disabled={disabled}
          >
            <FileDownloadIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleDownload('png')}>
          {t`wordstream_download_png`}
        </MenuItem>
        <MenuItem onClick={() => handleDownload('svg')}>
          {t`wordstream_download_svg`}
        </MenuItem>
      </Menu>
    </>
  )
}

export default WordStreamDownloadButton
