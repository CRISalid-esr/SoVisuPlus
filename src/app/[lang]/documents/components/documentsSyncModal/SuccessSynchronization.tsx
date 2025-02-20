import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import { Box, Tooltip } from '@mui/material'
import Image from 'next/image'
import { FC, useState } from 'react'
import PlatformChangesList from './PlatformChangesList'

const SuccessSynchronization: FC<{
  platform: { changes: { added: number; updated: number; deleted: number } }
}> = ({ platform }) => {
  const [hovered, setHovered] = useState(false)
  return (
    <Tooltip title={<PlatformChangesList changes={platform.changes} />} arrow>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-block',
          width: 40,
          height: 40,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Image
          src='/icons/success.svg'
          alt='success'
          width={40}
          height={40}
          priority
        />
        {hovered && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '50%',
            }}
          >
            <AddOutlinedIcon sx={{ color: 'white', fontSize: 24 }} />
          </Box>
        )}
      </Box>
    </Tooltip>
  )
}

export default SuccessSynchronization
