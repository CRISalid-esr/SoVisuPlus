// SidebarStyles.ts
import { makeStyles } from '@mui/styles'
import { Theme } from '@mui/material/styles';

interface SidebarStylesProps {
  isMobile: boolean
  open: boolean
}

const useSidebarStyles = makeStyles((theme: Theme) => {
   // console.log("theme",theme)
    return ({
        backdrop: {
          backgroundColor: theme.palette.gray950,
          opacity: 1,
          transition: 'none',
          zIndex: theme.zIndex.drawer - 1,
        },
        closeButton: {
          zIndex: theme.zIndex.drawer + 3,
          position: 'absolute',
          top: theme.spacing(1.5),
          right: theme.spacing(2.5),
          color: theme.palette.white,
          fontSize: theme.utils.pxToRem(24),
        },
        drawerPaper: (props:SidebarStylesProps) => ({
          zIndex: theme.zIndex.drawer + 2, // Ensure it's above the backdrop
          '& .MuiDrawer-paper': {
            width: props.open ? 280 : 60, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.1s ease',
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
          },
        }),
        drawerCollapsed: {
          width: 60,
        },
        textField: {
          height: theme.utils.pxToRem(46),
          backgroundColor: theme.palette.white,
          borderRadius: theme.spacing(1),
          marginTop: theme.spacing(3),
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              border: 'none',
            },
          },
          '& .MuiInputBase-input': {
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          },
        },
      })
})

export default useSidebarStyles
