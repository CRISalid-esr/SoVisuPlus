'use client'

import { Trans } from '@lingui/macro'
import {
  Backdrop,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material'
import Avatar from '@mui/material/Avatar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import CloseIcon from '@mui/icons-material/Close'

import { BarChartSquare02 as BarChartSquare } from '@untitled-ui/icons-react'
import { CheckDone01 as CheckDone } from '@untitled-ui/icons-react'
import { LayersThree01 as LayerThere } from '@untitled-ui/icons-react'
import { LifeBuoy01 as LifeBuoy } from '@untitled-ui/icons-react'
import { LogOut01 as Logout } from '@untitled-ui/icons-react'
import { Settings01 as Settings } from '@untitled-ui/icons-react'
import { User01 as Users } from '@untitled-ui/icons-react'
import { SearchLg, SearchSm } from '@untitled-ui/icons-react'

export default function Sidebar({
  open,
  handleToggleDrawer,
}: {
  open: boolean
  handleToggleDrawer: () => void
}) {
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()

  const handleChange = (event: SelectChangeEvent) => {
    const pathWithoutLang = pathname.split('/').slice(2).join('/') // Remove the current lang segment
    router.push(`/${event.target.value}/${pathWithoutLang}`)
  }

  return (
    <>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        sx={{
          zIndex: 1200, // Ensure it's above other elements
          '& .MuiDrawer-paper': {
            width: open ? 280 : 60, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.3s ease',
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
          },
        }}
        ModalProps={{
          keepMounted: true, // Improve performance on mobile
        }}
      >
        <Backdrop
          open={open && isMobile}
          style={{
            opacity: 1,
            transition: 'none',
            transitionDuration: '0s',
            zIndex: 2, // Ensure it's above other elements
          }}
        >
          <IconButton
            onClick={handleToggleDrawer}
            style={{
              opacity: 1,
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: 'white',
            }}
          >
            <CloseIcon />
          </IconButton>
        </Backdrop>
        <Box
          sx={{
            marginTop: '32px',
            marginLeft: open ? '20px' : '0px',
            marginRight: open ? '20px' : '0px',
            zIndex: 1201, // to ensure the drawer appears above the backdrop
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {open ? (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    src='/logo.svg'
                    alt='Crisalid logo'
                    width={32}
                    height={32}
                    priority
                  />
                  <Image
                    src='/soVisuPlus.svg'
                    alt='Crisalid logo'
                    width={123.966}
                    height={24.795}
                    priority
                  />
                </Box>
                {!isMobile && (
                  <IconButton
                    onClick={handleToggleDrawer}
                    sx={{
                      marginLeft: 'auto',
                      zIndex: 1201, // to ensure the button appears above the drawer
                    }}
                  >
                    <Avatar
                      src='/hideSidePanel.svg' 
                      alt='sidepanel'
                      sx={{ width: 24, height: 24 }}
                    />
                  </IconButton>
                )}
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  flexDirection: 'column',
                  margin: '0 auto',
                }}
              >
                {
                  <IconButton
                    onClick={handleToggleDrawer}
                    sx={{
                      zIndex: 1201,
                    }}
                  >
                    <Avatar
                      src='/showSidePanel.svg'
                      alt='sidepanel'
                      sx={{ width: 24, height: 24 }}
                    />
                  </IconButton>
                }
                <Image
                  src='/logo.svg'
                  alt='Crisalid logo'
                  width={32}
                  height={32}
                  priority
                />
              </Box>
            )}
          </Box>
          <Box>
            {open ? (
              <TextField
                sx={{
                  height: '46px',
                  backgroundColor: theme.palette.white,
                  borderRadius: '8px',
                  marginTop: '24px',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      border: 'none', // Remove the border
                    },
                  },
                  '& .MuiInputBase-input': {
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    fontSize: theme.utils.pxToRem(16),
                    fontWeight: theme.typography.fontWeightRegular,
                    color: theme.palette.primary.main,
                    opacity: 1,
                    lineHeight: theme.typography.lineHeight.lineHeight24px,
                  },
                }}
                placeholder='Chercher'
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchLg
                        width={20}
                        height={20}
                        color={theme.palette.primary.main}
                      />
                    </InputAdornment>
                  ),
                }}
              />
            ) : (
              <List>
                <ListItem component={Link} href={`/${lang}/dashboard`}>
                  <ListItemIcon
                    sx={{
                      height: 24,
                      width: 24,
                      minWidth: 'unset',
                      cursor: 'pointer',
                    }}
                    onClick={handleToggleDrawer}
                  >
                    <SearchSm color={theme.palette.onPrimaryContainer} />
                  </ListItemIcon>
                </ListItem>
                <ListItem />
              </List>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            }}
          >
            <Box>
              <List>
                <ListItem component={Link} href={`/${lang}/dashboard`}>
                  <ListItemIcon
                    sx={{
                      height: 24,
                      width: 24,
                      minWidth: 'unset',
                      marginRight: '12px',
                    }}
                  >
                    <BarChartSquare color={theme.palette.onPrimaryContainer} />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        color: theme.palette.onPrimaryContainer,
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_dashboard</Trans>}
                    />
                  )}
                </ListItem>
                <ListItem
                  component={Link}
                  href={`/${lang}/dashboard/publications`}
                >
                  <ListItemIcon
                    sx={{
                      height: 24,
                      width: 24,
                      minWidth: 'unset',
                      marginRight: '12px',
                    }}
                  >
                    <LayerThere color={theme.palette.onPrimaryContainer} />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        color: theme.palette.onPrimaryContainer,
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          color: theme.palette.onPrimaryContainer,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_publications</Trans>}
                    />
                  )}
                </ListItem>
                <ListItem
                  component={Link}
                  href={`/${lang}/dashboard/expertise`}
                >
                  <ListItemIcon
                    sx={{
                      height: 24,
                      width: 24,
                      minWidth: 'unset',
                      marginRight: '12px',
                    }}
                  >
                    <CheckDone color={theme.palette.onPrimaryContainer} />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        color: theme.palette.onPrimaryContainer,
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          color: theme.palette.onPrimaryContainer,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_expertise</Trans>}
                    />
                  )}
                </ListItem>
              </List>
            </Box>
            <Box>
              <ListItem component={Link} href={`/${lang}/dashboard/my-groups`}>
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <Users color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      color: theme.palette.onPrimaryContainer,
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        color: theme.palette.onPrimaryContainer,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_my_groups</Trans>}
                  />
                )}
              </ListItem>
              <ListItem
                component={Link}
                href={`/${lang}/dashboard/institutions`}
              >
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <LifeBuoy color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      color: theme.palette.onPrimaryContainer,
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        color: theme.palette.onPrimaryContainer,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_institutions</Trans>}
                  />
                )}
              </ListItem>
              <ListItem
                component={Link}
                href={`/${lang}/dashboard/laboratories`}
              >
                <ListItemIcon
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                  }}
                >
                  <Settings color={theme.palette.onPrimaryContainer} />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      color: theme.palette.onPrimaryContainer,
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        color: theme.palette.onPrimaryContainer,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_laboratories</Trans>}
                  />
                )}
              </ListItem>
            </Box>
          </Box>
          <Box sx={{ minWidth: 200 }}>
            {open ? (
              <TextField
                sx={{
                  '& .MuiSelect-icon': {
                    color: theme.palette.white,
                  },
                  marginTop: theme.utils.pxToRem(24),
                  marginBottom: theme.utils.pxToRem(24),
                  '& .MuiOutlinedInput-root': {
                    fontSize: theme.utils.pxToRem(16),
                    '& fieldset': {
                      border: 'none', // Remove the border
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontWeight: theme.typography.fontWeightRegular,
                    color: theme.palette.white,
                    opacity: 1,
                    lineHeight: theme.typography.lineHeight.lineHeight24px,
                  },
                }}
                fullWidth
                select
                value={lang}
                onChange={(event) => handleChange(event as SelectChangeEvent)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Image
                        src='/icons/language.svg'
                        alt='Crisalid logo'
                        width={24}
                        height={24}
                        priority
                      />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem id='en' value='en'>
                  English
                </MenuItem>
                <MenuItem id='fr' value='fr'>
                  Français
                </MenuItem>
              </TextField>
            ) : (
              <ListItem>
                <ListItemIcon
                  onClick={handleToggleDrawer}
                  sx={{
                    height: 24,
                    width: 24,
                    minWidth: 'unset',
                    marginRight: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <Image
                    src='/icons/language.svg'
                    alt='Crisalid logo'
                    width={24}
                    height={24}
                    priority
                  />
                </ListItemIcon>
              </ListItem>
            )}
          </Box>
          {open ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                borderTop: '1px solid',
                borderColor: theme.palette.white,
              }}
            >
              <Image
                src='/avatar.png'
                alt='Crisalid logo'
                width={40}
                height={40}
                priority
              />
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    color={theme.palette.white}
                    sx={{
                      fontWeight: theme.typography.fontWeightMedium,
                      fontSize: theme.utils.pxToRem(16),
                      lineHeight: theme.typography.lineHeight.lineHeight20px,
                    }}
                  >
                    Antoine Dupont
                  </Typography>
                  <IconButton
                    sx={{
                      marginLeft: 'auto',
                      paddingRight: '0px',
                    }}
                  >
                    <Logout
                      width={20}
                      height={20}
                      color={theme.palette.white}
                    />
                  </IconButton>
                </Box>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '20px',
                  }}
                  color={theme.palette.white}
                >
                  antoine.dupont@univ-nantes.fr
                </Typography>
              </Box>
            </Box>
          ) : (
            <ListItem>
              <ListItemIcon
                onClick={handleToggleDrawer}
                sx={{
                  height: 24,
                  width: 24,
                  minWidth: 'unset',
                  marginRight: '12px',
                  borderTop: '1px solid',
                  borderColor: theme.palette.white,
                  paddingTop: '24px',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src='/avatar.png'
                  alt='Crisalid logo'
                  width={24}
                  height={24}
                  priority
                />
              </ListItemIcon>
            </ListItem>
          )}
        </Box>
      </Drawer>
    </>
  )
}
