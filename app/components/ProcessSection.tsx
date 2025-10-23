import { useRef } from "react";
import { workSans } from "@/lib/fonts";
import { useAutoplayVideo } from "@/app/hooks/useAutoplayVideo";

const processSteps = [
  {
    number: "01",
    title: "UNDERSTAND",
    description:
      "When we invite you, answer a few simple questions. We learn what you need.",
  },
  {
    number: "02",
    title: "RECOMMEND",
    description:
      "We compare options and set up the policy that fits you best. You approve with one click.",
  },
  {
    number: "03",
    title: "CHECK",
    description:
      "Each year we shop again. If a better option appears, we tell you and handle the switch.",
  },
] as const;

export function ProcessSection() {
  const processVideoRef = useRef<HTMLVideoElement | null>(null);

  useAutoplayVideo(processVideoRef, { playbackRate: 0.6 });

  return (
    <section className="relative isolate min-h-[calc(100vh-160px)] overflow-hidden lg:min-h-[min(900px,calc(100vh-80px))]">
      <video
        ref={processVideoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        src="https://samuraiinsurancestorage.blob.core.windows.net/videos/traffic%20background.mp4?sp=r&st=2025-10-20T23:36:36Z&se=2027-12-31T08:51:36Z&spr=https&sv=2024-11-04&sr=b&sig=%2FI%2FI4hmtypmJof3J%2FP%2B0UNgVvpa%2B0HMKyiJg%2FrV3lPk%3D"
      >
        Your browser does not support the video tag.
      </video>
      <div
        className="absolute inset-0 bg-[#0f0f10]/70 mix-blend-multiply"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 pt-24 pb-16 sm:px-10 sm:py-32 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)] lg:items-start lg:gap-24">
        <div className="w-full text-center lg:col-start-2 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:items-end lg:justify-center lg:pl-6 lg:text-right">
          <p className="text-4xl font-bold leading-tight text-[#f7f6f3] sm:text-[56px] lg:max-w-lg lg:text-[64px] lg:leading-[1.08]">
            <span className="block whitespace-nowrap">Go from Worried</span>
            <span className="block">to Relieved</span>
          </p>
        </div>
        <ul className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {processSteps.map((step) => (
            <li key={step.title}>
              <div
                tabIndex={0}
                className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0f0f10]/40 px-7 py-8 transition duration-300 ease-out hover:border-[#f7f6f3]/40 hover:bg-[#0f0f10]/55 focus:outline-none focus-visible:border-[#f7f6f3]/40 focus-visible:ring-2 focus-visible:ring-[#f7f6f3]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <div className="flex flex-wrap items-baseline gap-4 sm:flex-nowrap sm:items-center sm:gap-7">
                  <span className="text-4xl font-bold text-[#de5e48] sm:text-6xl lg:text-7xl">
                    {step.number}
                  </span>
                  <span className="text-2xl font-bold uppercase tracking-wide text-[#f7f6f3] sm:text-4xl lg:text-5xl">
                    {step.title}
                  </span>
                </div>
                <div
                  className={`${workSans.className} max-h-none overflow-visible pt-6 text-lg leading-relaxed text-[#f7f6f3]/90 opacity-100 transition-all duration-300 ease-in-out sm:max-h-0 sm:overflow-hidden sm:pt-0 sm:opacity-0 sm:group-hover:max-h-48 sm:group-hover:pt-6 sm:group-hover:opacity-100 sm:group-focus-within:max-h-48 sm:group-focus-within:pt-6 sm:group-focus-within:opacity-100 sm:text-xl`}
                >
                  <p>{step.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

