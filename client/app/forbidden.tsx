'use client';

export default function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-site">
      <div className="flex items-center">
        <h2 className="text-lg md:text-xl font-bold text-black">403</h2>
        {/* divider */}
        <div className="w-px h-8 bg-gray-400 mx-4"></div>
        <h2 className="text-lg md:text-xl font-bold text-black">
          {'Access Forbidden'}
        </h2>
      </div>
    </div>
  );
}
