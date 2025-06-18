import SvgIcon, { SvgIconOwnProps } from '@mui/material/SvgIcon'
import AttachFileIcon from '@mui/icons-material/AttachFile'

const AttachFileOffIcon = (props: SvgIconOwnProps) => (
  <span
    {...props}
    style={{
      display: 'inline-flex',
      position: 'relative',
    }}
  >
    <AttachFileIcon fontSize='inherit' />
    <SvgIcon
      fontSize='inherit'
      sx={{
        left: 0,
        position: 'absolute',
      }}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
      >
        <path strokeLinecap='round' strokeLinejoin='round' d='M 4 4 L 20 20' />
      </svg>
    </SvgIcon>
  </span>
)

export default AttachFileOffIcon
