'use client';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-site">
      <div className="flex items-center">
        <h2 className="text-lg md:text-xl font-bold text-black">404</h2>
        {/* divider */}
        <div className="w-px h-8 bg-gray-400 mx-4"></div>
        <h2 className="text-lg md:text-xl font-bold text-black">
          {'Page not found'}
        </h2>
      </div>
    </div>
  );
}
