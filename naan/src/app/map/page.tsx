import MapWrapper from '@/components/MapWrapper';

export const metadata = {
  title: 'WikiNITT Map',
  description: 'Interactive map of NIT Trichy campus.',
};

export default function MapPage() {
  return (
    <main className="w-full min-h-screen">
      <div className="w-full min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <MapWrapper />
      </div>
    </main>
  );
}
