import CommunityFeed from "@/components/CommunityFeed";
import CommunitySidebar from "@/components/CommunitySidebar";
import MobileCommunityList from "@/components/MobileCommunityList";
import CommunityLoginPrompt from "@/components/CommunityLoginPrompt";
import { auth } from "@/auth";

export default async function CommunityPage() {
  const session = await auth();

  if (!session) {
    return <CommunityLoginPrompt />;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="block lg:hidden">
              <MobileCommunityList />
            </div>
            <CommunityFeed />
          </div>

          <div className="hidden lg:block w-80 shrink-0">
            <CommunitySidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
