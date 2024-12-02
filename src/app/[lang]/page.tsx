// page.tsx (Server Component)
import { Box } from '@mui/material';
import { getServerSession } from 'next-auth';
import authOptions from '@/app/auth/auth_options';
import Splash from './splash';

type Props = {
  params: { lang: string };
};

export default async function Home({ params }: Props) {
  const { lang } = await params;
  const session = await getServerSession(authOptions);

  return (
    <Box display="flex" flexDirection="row" height="100vh" width="100vw">
      <Splash session={session} lang={lang} />
    </Box>
  );
}
