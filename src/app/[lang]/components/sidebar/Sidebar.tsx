'use client'

import Check from '@/public/icons/check.svg'
import DarkMode from '@/public/icons/dark_mode.svg'
import LightMode from '@/public/icons/light_mode.svg'
import SystemMode from '@/public/icons/system_mode.svg'

import { User } from '@/types/User'
import { Trans } from '@lingui/macro'
import {
  Backdrop,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'
import Avatar from '@mui/material/Avatar'
import { useTheme } from '@mui/material/styles'
import { Box, useMediaQuery } from '@mui/system'
import {
  BarChartSquare02 as BarChartSquare,
  CheckDone01 as CheckDone,
  LayersThree01 as LayerThere,
  LifeBuoy01 as LifeBuoy,
  LogOut01 as Logout,
  SearchSm,
  Settings01 as Settings,
  User01 as Users,
  XClose as Close,
} from '@untitled-ui/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ThemeMode, useThemeContext } from '../../context/ThemeContext'
import { SearchInput } from '../SearchInput'
import { signOut } from 'next-auth/react'
import { institutionalConfig } from '@/configs/index'

interface SidebarProps {
  handleToggleDrawerAction: () => void
  open: boolean
  user: User | null
}

export default function Sidebar({
  open,
  handleToggleDrawerAction,
  user,
}: SidebarProps) {
  const pathname = usePathname() // Get the current path
  const lang = pathname.split('/')[1] // Extract the `lang` dynamic segment
  const theme = useTheme()
  const { setTheme, currentTheme } = useThemeContext()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()

  const handleChange = (event: SelectChangeEvent) => {
    const pathWithoutLang = pathname.split('/').slice(2).join('/') // Remove the current lang segment
    router.push(`/${event.target.value}/${pathWithoutLang}`)
  }

  const handleChangeTheme = (event: SelectChangeEvent) => {
    setTheme(event.target.value as 'light' | 'dark' | 'system')
  }

  const renderThemeValue = (value: string) => {
    switch (value) {
      case 'light':
        return (
          <Box
            sx={{
              display: 'flex',
            }}
          >
            <LightMode
              style={{
                fill: theme.palette.primaryContainer,
              }}
            />
            <Typography
              variant='bodyLarge'
              sx={{
                color: theme.palette.primaryContainer,
              }}
              ml={1}
            >
              <Trans>sidebar_theme_light</Trans>
            </Typography>
          </Box>
        )
      case 'dark':
        return (
          <Box
            sx={{
              display: 'flex',
            }}
          >
            <DarkMode
              style={{
                fill: theme.palette.primaryContainer,
              }}
            />
            <Typography
              variant='bodyLarge'
              sx={{
                color: theme.palette.primaryContainer,
              }}
              ml={1}
            >
              <Trans>sidebar_theme_dark</Trans>
            </Typography>
          </Box>
        )
      case 'system':
        return (
          <Box
            sx={{
              display: 'flex',
            }}
          >
            <SystemMode
              style={{
                fill: theme.palette.primaryContainer,
              }}
            />
            <Typography
              variant='bodyLarge'
              sx={{
                color: theme.palette.primaryContainer,
              }}
              ml={1}
            >
              <Trans>sidebar_theme_dark</Trans>
            </Typography>
          </Box>
        )
      default:
        return null
    }
  }

  const renderThemeIcon = (value: string) => {
    switch (value) {
      case 'light':
        return (
          <LightMode
            style={{
              fill: theme.palette.primaryContainer,
            }}
          />
        )
      case 'dark':
        return (
          <DarkMode
            style={{
              fill: theme.palette.primaryContainer,
            }}
          />
        )
      case 'system':
        return (
          <SystemMode
            style={{
              fill: theme.palette.primaryContainer,
            }}
          />
        )
      default:
        return null
    }
  }

  const renderInstitutionalLogo = () => {
    if (currentTheme === ThemeMode.light) {
      return institutionalConfig.logos.lightSideBarLogo
    }
    return institutionalConfig.logos.darkSideBarLogo
  }

  return (
    <>
      {open && isMobile && (
        <>
          <Backdrop
            open={open && isMobile}
            style={{
              backgroundColor: theme.palette.gray950,
              opacity: 1,
              transition: 'none',
              transitionDuration: '0s',
              zIndex: theme.zIndex.drawer - 1, // Ensure it's below the drawer
            }}
          />
          <IconButton
            onClick={handleToggleDrawerAction}
            style={{
              zIndex: theme.zIndex.drawer + 3, // Ensure it's above the drawer
              opacity: 1,
              position: 'absolute',
              top: theme.utils.pxToRem(12),
              right: theme.utils.pxToRem(20),
              color: theme.palette.white,
              fontSize: theme.utils.pxToRem(24),
            }}
          >
            <Close />
          </IconButton>
        </>
      )}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        sx={{
          zIndex: theme.zIndex.drawer + 2,
          '& .MuiDrawer-paper': {
            width: open ? 280 : 80, // Drawer width depending on whether it's open or collapsed
            transition: 'width 0.1s ease',
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
            display: 'flex',
            flexDirection: 'column', // Ensures the drawer content is laid out vertically
            height: '100vh', // Full viewport height
          },
        }}
        ModalProps={{
          keepMounted: true, // Improve performance on mobile
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Box
            px={2}
            sx={{
              marginTop: isMobile ? theme.spacing(2) : theme.spacing(4),
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
                    src={renderInstitutionalLogo()}
                    alt='logo'
                    width={0}
                    height={0}
                    sizes='100vw'
                    style={{ width: '100%', height: 'auto' }} // optional
                    priority
                  />
                </Box>
                {!isMobile && (
                  <IconButton
                    onClick={handleToggleDrawerAction}
                    sx={{
                      marginLeft: 'auto',
                      zIndex: 1201, // to ensure the button appears above the drawer
                    }}
                  >
                    <Avatar
                      src='/icons/hideSidePanel.svg'
                      alt='sidepanel'
                      sx={{
                        width: theme.utils.pxToRem(24),
                        height: theme.utils.pxToRem(24),
                      }}
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
                    onClick={handleToggleDrawerAction}
                    sx={{
                      zIndex: 1201,
                    }}
                  >
                    <Avatar
                      src='/icons/showSidePanel.svg'
                      alt='sidepanel'
                      sx={{ width: 24, height: 24 }}
                    />
                  </IconButton>
                }
                <Image
                  src={renderInstitutionalLogo()}
                  alt='logo'
                  width={0}
                  height={0}
                  sizes='100vw'
                  style={{ width: '100%', height: 'auto' }} // optional
                  priority
                />
              </Box>
            )}
          </Box>
          <Box
            px={2}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1, // Allow the content box to take up available space
              overflowY: 'auto', // Allows scrolling if the content exceeds the available space
            }}
          >
            <Box component='div' sx={{}} pt={3} pb={open ? 3 : 0}>
              {open ? (
                <SearchInput />
              ) : (
                <List
                  sx={{
                    paddingBottom: 0,
                  }}
                >
                  <ListItem
                    sx={{
                      marginBottom: theme.utils.pxToRem(4),
                      color: theme.palette.primaryContainer,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: theme.palette.sidebarItemHover,
                        borderRadius: theme.utils.pxToRem(8),
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        height: theme.utils.pxToRem(24),
                        width: theme.utils.pxToRem(24),
                        color: 'inherit',
                        minWidth: 'unset',
                        cursor: 'pointer',
                      }}
                      onClick={handleToggleDrawerAction}
                    >
                      <SearchSm />
                    </ListItemIcon>
                  </ListItem>
                </List>
              )}
            </Box>
            <Box>
              <ListItem
                component={Link}
                href={`/${lang}/dashboard`}
                onClick={() => isMobile && handleToggleDrawerAction()}
                sx={{
                  marginBottom: theme.utils.pxToRem(4),
                  color: theme.palette.primaryContainer,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '&:hover': {
                    backgroundColor: theme.palette.sidebarItemHover,
                    borderRadius: theme.utils.pxToRem(8),
                    color: theme.palette.primaryContainer,
                  },
                  ...(pathname === `/${lang}/dashboard`
                    ? {
                        backgroundColor: theme.palette.primaryContainer,
                        borderRadius: theme.utils.pxToRem(8),
                        color: theme.palette.onPrimaryContainer,
                      }
                    : {}),
                }}
              >
                <ListItemIcon
                  sx={{
                    height: theme.utils.pxToRem(24),
                    width: theme.utils.pxToRem(24),
                    minWidth: 'unset',
                    marginRight: open ? theme.utils.pxToRem(12) : 0,
                    color: 'inherit',
                  }}
                >
                  <BarChartSquare />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_dashboard</Trans>}
                  />
                )}
              </ListItem>
              <ListItem
                component={Link}
                href={`/${lang}/documents`}
                onClick={() => isMobile && handleToggleDrawerAction()}
                sx={{
                  marginBottom: theme.utils.pxToRem(4),
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: theme.palette.primaryContainer,
                  ...(pathname === `/${lang}/documents`
                    ? {
                        backgroundColor: theme.palette.primaryContainer,
                        borderRadius: theme.utils.pxToRem(8),
                        color: theme.palette.onPrimaryContainer,
                      }
                    : {}),
                  '&:hover': {
                    backgroundColor: theme.palette.sidebarItemHover,
                    borderRadius: theme.utils.pxToRem(8),
                    color: theme.palette.primaryContainer,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    height: theme.utils.pxToRem(24),
                    width: theme.utils.pxToRem(24),
                    minWidth: 'unset',
                    marginRight: open ? theme.utils.pxToRem(12) : 0,
                    color: 'inherit',
                  }}
                >
                  <LayerThere />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_documents</Trans>}
                  />
                )}
              </ListItem>
              <ListItem
                component={Link}
                href={`/${lang}/expertise`}
                onClick={() => isMobile && handleToggleDrawerAction()}
                sx={{
                  marginBottom: theme.utils.pxToRem(4),
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: theme.palette.primaryContainer,
                  ...(pathname === `/${lang}/expertise`
                    ? {
                        backgroundColor: theme.palette.primaryContainer,
                        borderRadius: theme.utils.pxToRem(8),
                        color: theme.palette.onPrimaryContainer,
                      }
                    : {}),
                  '&:hover': {
                    backgroundColor: theme.palette.sidebarItemHover,
                    borderRadius: theme.utils.pxToRem(8),
                    color: theme.palette.primaryContainer,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    height: theme.utils.pxToRem(24),
                    width: theme.utils.pxToRem(24),
                    minWidth: 'unset',
                    marginRight: open ? theme.utils.pxToRem(12) : 0,
                    color: 'inherit',
                  }}
                >
                  <CheckDone />
                </ListItemIcon>
                {open && (
                  <ListItemText
                    sx={{
                      '& .MuiTypography-root': {
                        fontFamily: 'Inter, Roboto, sans-serif',
                        fontSize: theme.utils.pxToRem(16),
                        fontWeight: theme.typography.fontWeightMedium,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    primary={<Trans>side_bar_expertise</Trans>}
                  />
                )}
              </ListItem>
            </Box>
            <Box
              pb={3}
              sx={{
                marginTop: 'auto', // Pushes these boxes to the bottom of the content area
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Second Box */}
              <Box pb={3}>
                <ListItem
                  sx={{
                    marginBottom: theme.utils.pxToRem(4),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: theme.palette.primaryContainer,
                    ...(pathname === `/${lang}/my-groups`
                      ? {
                          backgroundColor: theme.palette.primaryContainer,
                          borderRadius: theme.utils.pxToRem(8),
                          color: theme.palette.onPrimaryContainer,
                        }
                      : {}),
                    '&:hover': {
                      backgroundColor: theme.palette.sidebarItemHover,
                      borderRadius: theme.utils.pxToRem(8),
                      color: theme.palette.primaryContainer,
                    },
                  }}
                  component={Link}
                  href={`/${lang}/my-groups`}
                  onClick={() => isMobile && handleToggleDrawerAction()}
                >
                  <ListItemIcon
                    sx={{
                      height: theme.utils.pxToRem(24),
                      width: theme.utils.pxToRem(24),
                      minWidth: 'unset',
                      marginRight: open ? theme.utils.pxToRem(12) : 0,
                      color: 'inherit',
                    }}
                  >
                    <Users />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_my_groups</Trans>}
                    />
                  )}
                </ListItem>
                <ListItem
                  sx={{
                    marginBottom: theme.utils.pxToRem(4),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: theme.palette.primaryContainer,
                    ...(pathname === `/${lang}/institutions`
                      ? {
                          backgroundColor: theme.palette.primaryContainer,
                          borderRadius: theme.utils.pxToRem(8),
                          color: theme.palette.onPrimaryContainer,
                        }
                      : {}),
                    '&:hover': {
                      backgroundColor: theme.palette.sidebarItemHover,
                      borderRadius: theme.utils.pxToRem(8),
                      color: theme.palette.primaryContainer,
                    },
                  }}
                  component={Link}
                  href={`/${lang}/institutions`}
                  onClick={() => isMobile && handleToggleDrawerAction()}
                >
                  <ListItemIcon
                    sx={{
                      height: theme.utils.pxToRem(24),
                      width: theme.utils.pxToRem(24),
                      minWidth: 'unset',
                      marginRight: open ? theme.utils.pxToRem(12) : 0,
                      color: 'inherit',
                    }}
                  >
                    <LifeBuoy />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_institutions</Trans>}
                    />
                  )}
                </ListItem>
                <ListItem
                  sx={{
                    marginBottom: theme.utils.pxToRem(4),
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: theme.palette.primaryContainer,
                    ...(pathname === `/${lang}/laboratories`
                      ? {
                          backgroundColor: theme.palette.primaryContainer,
                          borderRadius: theme.utils.pxToRem(8),
                          color: theme.palette.onPrimaryContainer,
                        }
                      : {}),
                    '&:hover': {
                      backgroundColor: theme.palette.sidebarItemHover,
                      borderRadius: theme.utils.pxToRem(8),
                      color: theme.palette.primaryContainer,
                    },
                  }}
                  component={Link}
                  href={`/${lang}/laboratories`}
                  onClick={() => isMobile && handleToggleDrawerAction()}
                >
                  <ListItemIcon
                    sx={{
                      height: theme.utils.pxToRem(24),
                      width: theme.utils.pxToRem(24),
                      minWidth: 'unset',
                      marginRight: open ? theme.utils.pxToRem(12) : 0,
                      color: 'inherit',
                    }}
                  >
                    <Settings />
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      sx={{
                        '& .MuiTypography-root': {
                          fontFamily: 'Inter, Roboto, sans-serif',
                          fontSize: theme.utils.pxToRem(16),
                          fontWeight: theme.typography.fontWeightMedium,
                          lineHeight:
                            theme.typography.lineHeight.lineHeight24px,
                        },
                      }}
                      primary={<Trans>side_bar_laboratories</Trans>}
                    />
                  )}
                </ListItem>
              </Box>
              {/* Third Box */}
              <Box>
                {open ? (
                  <Select
                    aria-label='Theme switcher'
                    name='theme switcher'
                    labelId='Theme'
                    id='Theme'
                    label='Theme'
                    value={currentTheme}
                    onChange={handleChangeTheme}
                    variant='outlined'
                    fullWidth
                    renderValue={renderThemeValue}
                    inputProps={{
                      'aria-label': 'theme switcher',
                    }}
                    sx={{
                      boxShadow: 'none',
                      '& :focus-visible': {
                        outline: '2px solid #fff',
                        border: '2px solid #000',
                      },
                      '.MuiOutlinedInput-notchedOutline': { border: 0 },
                      '&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline':
                        {
                          border: 0,
                        },
                      '&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                        {
                          border: 0,
                        },
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                      },
                      '& .MuiSvgIcon-fontSizeMedium': {
                        fontWeight: theme.typography.fontWeightRegular,
                        color: theme.palette.white,
                        opacity: 1,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                  >
                    <MenuItem value='light'>
                      <ListItemIcon>
                        <LightMode
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Trans>sidebar_theme_light</Trans>
                      </ListItemText>
                      {currentTheme === ThemeMode.light && (
                        <Check
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      )}
                    </MenuItem>
                    <MenuItem value='dark'>
                      <ListItemIcon>
                        <DarkMode
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Trans>sidebar_theme_dark</Trans>
                      </ListItemText>
                      {currentTheme === ThemeMode.dark && (
                        <Check
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      )}
                    </MenuItem>
                    <MenuItem value='system'>
                      <ListItemIcon>
                        <SystemMode
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText>
                        <Trans>sidebar_theme_system</Trans>
                      </ListItemText>
                      {currentTheme === ThemeMode.system && (
                        <Check
                          style={{
                            fill: theme.palette.onSurface,
                          }}
                        />
                      )}
                    </MenuItem>
                  </Select>
                ) : (
                  <ListItem
                    sx={{
                      marginBottom: theme.utils.pxToRem(4),
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: theme.palette.primaryContainer,
                      '&:hover': {
                        backgroundColor: theme.palette.sidebarItemHover,
                        borderRadius: theme.utils.pxToRem(8),
                        color: theme.palette.primaryContainer,
                      },
                    }}
                  >
                    <ListItemIcon
                      onClick={handleToggleDrawerAction}
                      sx={{
                        height: theme.utils.pxToRem(24),
                        width: theme.utils.pxToRem(24),
                        minWidth: 'unset',
                        marginRight: open ? theme.utils.pxToRem(12) : 0,
                        color: 'inherit',
                      }}
                    >
                      {renderThemeIcon(currentTheme)}
                    </ListItemIcon>
                  </ListItem>
                )}
              </Box>
              <Box>
                {open ? (
                  <Select
                    aria-label='Language switcher'
                    name='language switcher'
                    variant='outlined'
                    fullWidth
                    inputProps={{
                      'aria-label': 'Language switcher',
                    }}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: '1px solid transparent',
                      },
                      '& :focus-visible': {
                        outline: '2px solid #fff',
                        border: '2px solid #000',
                      },
                      '& .MuiSelect-icon': {
                        color: theme.palette.white,
                      },
                      '& .MuiOutlinedInput-root': {
                        fontSize: theme.utils.pxToRem(16),
                        '& fieldset': {
                          border: 0,
                        },
                      },
                      '& .MuiInputBase-input': {
                        fontWeight: theme.typography.fontWeightRegular,
                        color: theme.palette.white,
                        opacity: 1,
                        lineHeight: theme.typography.lineHeight.lineHeight24px,
                      },
                    }}
                    value={lang}
                    onChange={(event) =>
                      handleChange(event as SelectChangeEvent)
                    }
                    renderValue={(value) => (
                      <Box
                        sx={{
                          display: 'flex',
                        }}
                      >
                        <Image
                          src='/icons/language.svg'
                          alt='language'
                          width={24}
                          height={24}
                          priority
                        />
                        <Typography
                          variant='bodyLarge'
                          sx={{
                            color: theme.palette.primaryContainer,
                          }}
                          ml={1}
                        >
                          {value === 'en' ? 'English' : 'Français'}
                        </Typography>
                      </Box>
                    )}
                  >
                    <MenuItem id='en' value='en'>
                      English
                    </MenuItem>
                    <MenuItem id='fr' value='fr'>
                      Français
                    </MenuItem>
                  </Select>
                ) : (
                  <ListItem
                    sx={{
                      marginBottom: theme.utils.pxToRem(4),
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      color: theme.palette.primaryContainer,
                      '&:hover': {
                        backgroundColor: theme.palette.sidebarItemHover,
                        borderRadius: theme.utils.pxToRem(8),
                        color: theme.palette.primaryContainer,
                      },
                    }}
                  >
                    <ListItemIcon
                      onClick={handleToggleDrawerAction}
                      sx={{
                        height: theme.utils.pxToRem(24),
                        width: theme.utils.pxToRem(24),
                        minWidth: 'unset',
                        marginRight: open ? theme.utils.pxToRem(12) : 0,
                        color: 'inherit',
                      }}
                    >
                      <Image
                        src='/icons/language.svg'
                        alt='language'
                        style={{ fill: 'red' }}
                        width={24}
                        height={24}
                        priority
                      />
                    </ListItemIcon>
                  </ListItem>
                )}
              </Box>
            </Box>
          </Box>
          <Box
            px={2}
            sx={{
              position: 'sticky', // Keep the footer at the bottom of the drawer
              bottom: 20, // Align it at the bottom
              left: 0,
              width: '100%', // Ensure it spans the full width
              padding: theme.spacing(2),
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {open ? (
              <Box
                pt={1}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  borderTop: '1px solid',
                  borderColor: theme.palette.white,
                  width: '100%',
                }}
              >
                <IconButton
                  title='account'
                  onClick={() => router.push(`/${lang}/myAccount`)}
                >
                  <Image
                    src='/icons/avatar.png'
                    alt='avatar'
                    width={40}
                    height={40}
                    priority
                  />
                </IconButton>

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
                      {user?.person?.firstName} {user?.person?.lastName}
                    </Typography>
                    <IconButton
                      title='Logout'
                      sx={{
                        marginLeft: 'auto',
                        paddingRight: '0px',
                      }}
                      onClick={async () =>
                        await signOut({
                          callbackUrl: '/api/logout',
                        })
                      }
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
                      fontSize: theme.utils.pxToRem(12),
                      fontWeight: theme.typography.fontWeightRegular,
                      lineHeight: theme.typography.lineHeight.lineHeight16px,
                    }}
                    color={theme.palette.white}
                  >
                    {user?.person?.email}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <ListItem>
                <ListItemIcon
                  onClick={() => {
                    router.push(`/${lang}/myAccount`)
                    handleToggleDrawerAction()
                  }}
                  sx={{
                    height: theme.utils.pxToRem(24),
                    width: theme.utils.pxToRem(24),
                    minWidth: 'unset',
                    marginRight: theme.utils.pxToRem(12),
                    borderTop: '1px solid',
                    borderColor: theme.palette.white,
                    paddingTop: theme.spacing(3),
                    cursor: 'pointer',
                  }}
                >
                  <Image
                    src='/avatar.png'
                    alt='avatar'
                    width={24}
                    height={24}
                    priority
                  />
                </ListItemIcon>
              </ListItem>
            )}
          </Box>
        </Box>
      </Drawer>
    </>
  )
}
