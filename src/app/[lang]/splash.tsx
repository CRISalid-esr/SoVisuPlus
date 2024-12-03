'use client';

import { Box, Button, Typography } from '@mui/material';
import { t } from '@lingui/macro';
import Logo from '@/public/logo_splash_screen.svg';
import Oval from '@/public/Oval.svg';
import Oval1 from '@/public/Oval_1.svg';
import Oval2 from '@/public/Oval_2.svg';
import Oval3 from '@/public/Oval_3.svg';
import Avatars from '@/public/avatars.svg';
import { signIn,signOut } from 'next-auth/react'

type ClientHomeProps = {
  session: { user: { email: string } } | null,
};

export default function splash({ session }: ClientHomeProps) {


  return (
    <>
      <Box flex={{ xs: 1, md: 1 }}>
        <Box
          sx={(theme)=>({
            padding: theme.spacing(6),
          })}
        >
          <Logo />
        </Box>
        <Box display="flex" justifyContent="center" alignItems="center">
          <Box width="100%" maxWidth="400px">
          {session?.user ? (
        <>
          <Box>You are logged in as {session?.user?.email}</Box>
          <Button
             onClick={() => signOut()}
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: 'teal',
                mb: 2,
                '&:hover': { backgroundColor: 'darkcyan' },
              }}
            >
              {t`splash.logout`}
            </Button>
        </>
      ) : (
        <>
          <Box>You are no logged in</Box>
          <Button
             onClick={() => signIn('keycloak')}
              fullWidth
              variant="contained"
              sx={{
                backgroundColor: 'teal',
                mb: 2,
                '&:hover': { backgroundColor: 'darkcyan' },
              }}
            >
              {t`splash.login`}
            </Button>
        </>
      )}

           
          </Box>
        </Box>
      </Box>
      <Box
        flex={1}
        display={{ xs: 'none', md: 'flex' }} // Hide on small screens
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        p={4}
        bgcolor="teal"
        color="white"
        position={'relative'}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <Oval3
            style={{
              width: '327px',
              height: '576px',
            }}
          />
        </Box>

        <Oval1
          style={{
            fill: 'red',
            position: 'absolute',
            top: 0,
            right: 0,
          }}
        />
        <Box
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
          }}
        >
          <Oval
            style={{
              width: '270px',
              height: '577px',
            }}
          />
        </Box>

        <Oval2
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
        />
        <Typography
          variant="displayLarge"
          sx={(theme)=>({
            mb: theme.spacing(18),
            zIndex: 1,
          })}
        >
          Lorem Ipsum
        </Typography>
        <Box
          sx={{
            maxWidth: '478.543px',
            position: 'relative',
          }}
        >
          <Typography
            component={'p'}
            variant="headingSmall"
            sx={(theme)=>({
              mb: theme.spacing(18),
              zIndex: 1,
            })}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Typography>
        </Box>
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Avatars />
          <Typography
            variant="bodyLarge"
            component={'p'}
            sx={{
              lineHeight: 'normal',
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit
          </Typography>
        </Box>
      </Box>
    </>
  );
}
