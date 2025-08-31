import Image from 'next/image';

export function HomeScreen() {
  return (
    <div className="mx-auto relative">
      <div className="relative">
        <div className="flex sm:flex-row flex-col bg-zinc-900">
          <div className="basis-1/2 text-center sm:text-left relative">
            <div className="px-6 sm:px-10 lg:px-14 py-6 bg-site">
              <h1 className="text-4xl sm:text-6xl lg:text-[120px] leading-tight sm:leading-none animate-fade-in font-bold">
                <span className="block">NETWORKING</span>
                <span className="block">MADE</span>
                <span className="block">SIMPLE</span>
              </h1>
              <h3 className="text-sm sm:text-base lg:text-2xl py-4 sm:py-6">
                PREMIUM NETWORKING SOLUTIONS BY{' '}
                <span className="text-purple-500">SAFAWI NETT</span>
              </h3>
              <div className="flex justify-center sm:justify-start mt-2">
                <button className="bg-black text-white font-semibold py-3 px-6 sm:px-8 rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 text-sm sm:text-base">
                  DISCOVER SOLUTIONS
                </button>
              </div>
            </div>
            <div className="bg-zinc-900 h-[75px] w-full"></div>
          </div>
          <div className="basis-1/2">
            <Image
              src="https://static.wixstatic.com/media/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg/v1/fill/w_918,h_585,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/503ea4_ed9a38760ae04aab86b47e82525fdcac~mv2.jpg"
              alt="TALI$A"
              className="w-full px-10 sm:px-0"
              width={1000}
              height={800}
            />
          </div>
        </div>
        <Image
          className="absolute inset-x-2/4 -translate-x-2/4 -translate-y-[20%] bottom-0 top-[20%] hidden sm:block"
          src="https://static.wixstatic.com/media/c22c23_14f3a617cd684341b51dd1a3962c856e~mv2.png/v1/fill/w_202,h_245,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/c22c23_14f3a617cd684341b51dd1a3962c856e~mv2.png"
          alt="TALI$A"
          width={202}
          height={245}
        />
      </div>

      {/* about me */}
      <div className="bg-zinc-900 text-site pt-16 sm:p-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-lg sm:text-xl text-white/90 font-default tracking-wide leading-relaxed px-6 sm:px-8">

          </div>
        </div>
      </div>
    </div>
  );
}
