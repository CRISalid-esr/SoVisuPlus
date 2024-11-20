'use client';

import { Drawer, List, ListItem, ListItemText } from '@mui/material';
import Link from 'next/link';
import { Trans } from '@lingui/macro';

export default function Sidebar() {
  return (
    <Drawer variant="permanent" anchor="left">
      <List>
        <ListItem  component={Link} href="">
          <ListItemText primary={<Trans>My Account</Trans>} />
        </ListItem>
      </List>
    </Drawer>
  );
}
