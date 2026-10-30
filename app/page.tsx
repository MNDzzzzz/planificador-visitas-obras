import React from 'react';
import { getInitialDataAction } from '../lib/actions/visits';
import { Dashboard } from '../components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialData = await getInitialDataAction();

  return <Dashboard initialData={initialData} />;
}
