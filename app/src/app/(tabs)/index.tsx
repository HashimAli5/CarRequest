import React from 'react';
import { useCurrentUser } from '../../context/AuthContext';
import { ApproverHome } from '../../screens/ApproverHome';
import { RequesterHome } from '../../screens/RequesterHome';

/** The home tab renders a different screen per role; the role comes from the server. */
export default function HomeTab() {
  const user = useCurrentUser();
  return user.role === 'APPROVER' ? <ApproverHome /> : <RequesterHome />;
}
