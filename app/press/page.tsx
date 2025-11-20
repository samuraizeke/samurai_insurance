import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/app/components/SiteFooter";

export default function PressPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[var(--background)]">
            {/* Dark Header Section */}
            <div className="bg-[var(--foreground)] text-[var(--background)] pb-96 relative overflow-hidden">
                {/* Custom Header with Inverted Logo */}
                <header className="sticky top-0 z-40 w-full bg-transparent backdrop-blur-sm">
                    <div className="flex w-full flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-16 sm:py-10 sm:text-left">
                        <Link href="/" className="flex items-center justify-center sm:justify-start">
                            <Image
                                src="/images/inverted-wordmark.png"
                                alt="Samurai Insurance"
                                width={300}
                                height={80}
                                priority
                            />
                        </Link>
                    </div>
                </header>

                <div className="container mx-auto px-6 pt-12 flex flex-col items-center text-center relative z-10">
                    {/* News Badge */}
                    <div className="mb-8 inline-block rounded-full border border-[var(--background)]/30 px-4 py-1 text-sm font-medium uppercase tracking-wider text-[var(--background)]">
                        News
                    </div>

                    {/* Title */}
                    <h1 className="mb-6 max-w-4xl text-4xl font-bold leading-tight uppercase md:text-6xl lg:text-7xl font-[family-name:var(--font-league-gothic)]">
                        Columbus Startup Launches AI Insurance Broker That Automatically Re-Shops Your Policy Every Year
                    </h1>

                    {/* Subtitle */}
                    <p className="mb-8 max-w-2xl text-lg font-bold leading-relaxed text-[var(--background)]/80 md:text-xl font-[family-name:var(--font-alte-haas)]">
                        Samurai Insurance eliminates the "rollover problem" costing Americans 12% annually; beta opens December
                    </p>

                    {/* Date */}
                    <div className="text-sm font-bold uppercase tracking-widest text-[var(--background)]/60 font-[family-name:var(--font-work-sans)]">
                        November 20, 2025
                    </div>
                </div>
            </div>

            {/* Image Section - Overlapping */}
            <div className="relative z-20 -mt-72 px-6 pb-24">
                <div className="container mx-auto max-w-2xl">
                    <div className="relative w-full overflow-hidden rounded-lg shadow-2xl">
                        <Image
                            src="/images/press.jpeg"
                            alt="Samurai Insurance Press Event"
                            width={1920}
                            height={1080}
                            className="w-full h-auto"
                            priority
                        />
                    </div>
                </div>
            </div>

            {/* Press Release Content */}
            <div className="px-6 pb-24">
                <div className="container mx-auto max-w-3xl font-[family-name:var(--font-work-sans)] text-[#333333]">
                    <div className="space-y-6 text-lg leading-relaxed">
                        <p>
                            <strong className="font-[family-name:var(--font-alte-haas)]">Columbus, OH – November 19, 2025</strong> – Americans spend $500 billion annually on auto and home insurance, yet 96% of insurance brokers never remind customers to shop for better rates. The result: prices quietly climb 12% per year while customers auto-renew, costing the average policyholder $3,600 over a decade.
                        </p>

                        <p>
                            Samurai Insurance just launched to fix that. The AI-powered broker automatically re-shops customers' policies every single year before renewal, and it's completely free to consumers.
                        </p>

                        <p>
                            "The entire industry is structurally designed around customer inertia," said Harley Allaby, CEO and co-founder. "Captive agents can only sell one carrier. Independent brokers favor carriers that pay higher commissions. DIY quote sites spam you and leave you to figure out coverage alone. Everyone profits when you don't shop around."
                        </p>

                        <p>
                            Sign up in seconds, load your insurance info in minutes and then never worry about your insurance again because Samurai will shop your policy automatically every year. Their guarantee? You'll never be rolled over again.
                        </p>

                        <p>
                            The service is free to consumers. Samurai earns standard broker commissions from insurance carriers, with no incentive to keep customers from shopping.
                        </p>

                        <p>
                            The beta launches in December, with manual quoting beginning in January. Samurai has 156 waitlist signups in its first two days and contracts with six major carriers. The company targets 150 customers per month by March and needs just 285,000 customers (0.17% of the market) to reach $100 million in revenue.
                        </p>

                        <p>
                            The founding team brings insurance and technology expertise from every level of the industry. Before Samurai, CEO Harley Allaby, CTO Zeke Negron, and CBO Jeremy Kester led operations, technology, and brand at a Medicare agency that scaled past $100 million in revenue. They've worked as licensed agents, independent adjusters, and in insurtech, giving them an insider's view of exactly why broker incentives fail consumers.
                        </p>

                        <p>
                            Samurai is currently participating in Founder University, Jason Calacanis's startup accelerator program. The beta opens to the public in December at joinsamurai.com.
                        </p>

                        <div className="pt-8 border-t border-[var(--foreground)]/20">
                            <p className="font-bold text-xl mb-4 font-[family-name:var(--font-alte-haas)]">About Samurai Insurance</p>
                            <p>
                                Samurai Insurance is an AI-powered insurance broker that eliminates annual price increases by automatically re-shopping customers' auto and renters insurance policies every year. Founded in 2024 and based in Columbus, Ohio, Samurai provides free service to consumers through standard insurance commissions. Learn more at joinsamurai.com.
                            </p>
                        </div>

                        <div className="pt-8 border-t border-[var(--foreground)]/20">
                            <p className="font-bold text-xl mb-4 font-[family-name:var(--font-alte-haas)]">Media Contact:</p>
                            <p>Jeremy Kester, CBO</p>
                            <p>Samurai Insurance</p>
                            <p>5 W. Main St</p>
                            <p>Westerville, OH 43081</p>
                            <p className="mt-4">
                                <a href="mailto:press@joinsamurai.com" className="underline hover:text-[#de5e48]">
                                    press@joinsamurai.com
                                </a>
                            </p>
                            <p className="mt-2">
                                <a href="https://joinsamurai.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                    joinsamurai.com
                                </a>
                            </p>
                            <div className="mt-4 space-y-1">
                                <p>
                                    <a href="https://twitter.com/JoinSamurai" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                        X
                                    </a>
                                </p>
                                <p>
                                    <a href="https://www.instagram.com/joinsamurai" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                        Instagram
                                    </a>
                                </p>
                                <p>
                                    <a href="https://www.facebook.com/samuraiinsurance" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                        Facebook
                                    </a>
                                </p>
                                <p>
                                    <a href="https://www.linkedin.com/company/samuraiinsurance/" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                        LinkedIn
                                    </a>
                                </p>
                                <p>
                                    <a href="https://www.tiktok.com/@samuraiinsurance" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#de5e48]">
                                        TikTok
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[var(--background)]"></div>

            <SiteFooter />
        </div>
    );
}
