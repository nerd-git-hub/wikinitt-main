import MapWrapper from '@/components/MapWrapper';

export const metadata = {
  title: 'WikiNITT Map',
  description: 'Interactive map of NIT Trichy campus.',
};

export default function MapPage() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <MapWrapper />
    </main>
  );
}
