import { getFloorsData } from '@/app/actions/units';
import { getBuildingFacesData } from '@/app/actions/building';
import StoreInitializer from './StoreInitializer';
import type { Floor } from '@/data/floors';

// Only interactive inventory routes need these records before rendering.
// React's request cache shares reads with child pages such as /plantas.
export default async function ShowroomDataLayout({ children }: { children: React.ReactNode }) {
  const [floors, faces] = await Promise.allSettled([
    getFloorsData(),
    getBuildingFacesData(),
  ]);
  if (floors.status === 'rejected') console.error('Failed to load floors:', floors.reason);
  if (faces.status === 'rejected') console.error('Failed to load building faces:', faces.reason);

  return (
    <StoreInitializer
      initialFloorsData={floors.status === 'fulfilled' ? floors.value as Floor[] : []}
      initialBuildingFacesData={faces.status === 'fulfilled' ? faces.value : []}
    >
      {children}
    </StoreInitializer>
  );
}
