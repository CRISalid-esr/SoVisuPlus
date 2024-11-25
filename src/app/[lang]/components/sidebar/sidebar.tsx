'use client'

import { Trans } from '@lingui/macro'
import {
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
import { useState } from 'react'
import {
  BarChartSquare,
  CheckDone,
  LayerThere,
  LifeBuoy,
  Logout,
  Settings,
  Users,
} from '../../../theme/icons'

import { SearchLg, SearchSm } from '@untitled-ui/icons-react'
export default function Sidebar() {
  const [open, setOpen] = useState(true) // Determines if the drawer is expanded or collapsed
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment
  const handleToggleDrawer = () => {
    setOpen((prev) => !prev)
  }
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
          '& .MuiDrawer-paper': {
            width: open ? (isMobile ? '80%' : 280) : 60, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.3s ease',
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
          },
        }}
        ModalProps={{
          keepMounted: true, // Improve performance on mobile
        }}
      >
        <Box
          sx={{
            marginTop: '32px',
            marginLeft: open ? '20px' : '0px',
            marginRight: open ? '20px' : '0px',
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
                      src='/hideSidePanel.svg' // Replace with your image path
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
                    fontSize: theme.typography.fontSize.rem14px,
                    fontWeight: theme.typography.fontWeight.normal,
                    color: theme.palette.primary40,
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
                        color={theme.palette.primary40}
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
                    <SearchSm  color={theme.palette.onPrimaryContainer} />
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
                          fontSize: theme.typography.fontSize.rem16px,
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
                          fontSize: theme.typography.fontSize.rem16px,
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
                          fontSize: theme.typography.fontSize.rem16px,
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
                        fontSize: theme.typography.fontSize.rem16px,
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
                        fontSize: theme.typography.fontSize.rem16px,
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
                        fontSize: theme.typography.fontSize.rem16px,
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
                  marginTop: theme.typography.pxToRem(24),
                  marginBottom: theme.typography.pxToRem(24),
                  '& .MuiOutlinedInput-root': {
                    fontSize: theme.typography.pxToRem(16),
                    '& fieldset': {
                      border: 'none', // Remove the border
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontWeight: theme.typography.fontWeight.normal,
                    color: theme.palette.white,
                    opacity: 1,
                    lineHeight: theme.typography.lineHeight.lineHeight24px,
                  },
                }}
                fullWidth
                select
                displayEmpty
                value={lang}
                onChange={handleChange}
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
                    variant='titleSmall'
                    color={theme.palette.white}
                    sx={{
                      fontWeight: 600,
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
