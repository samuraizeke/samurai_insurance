import { workSans } from "@/lib/fonts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebook,
  faInstagram,
  faXTwitter,
  faYoutube,
  faTiktok,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";

export function SiteFooter() {
  return (
    <footer className="pt-8 pb-28 sm:pb-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <p className={`${workSans.className} text-sm text-[#333333]/80`}>
            © 2025 Samurai Insurance. All Rights Reserved.
          </p>
          <a
            href="/privacy"
            className={`${workSans.className} text-sm text-[#de5e48] hover:text-[#de5e48]/80 transition-colors underline`}
          >
            Privacy Policy
          </a>
        </div>
        <nav aria-label="Social media">
          <ul className="flex flex-wrap items-center justify-center gap-3">
            <li>
              <a
                href="https://www.instagram.com/joinsamurai?igsh=NDM2eDF5M2hxMGZq"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">Instagram</span>
                <FontAwesomeIcon icon={faInstagram} className="h-5 w-5" />
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=61579597801044"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">Facebook</span>
                <FontAwesomeIcon icon={faFacebook} className="h-5 w-5" />
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/samuraiinsurance/"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">LinkedIn</span>
                <FontAwesomeIcon icon={faLinkedin} className="h-5 w-5" />
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@samuraiinsurance"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="TikTok"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">TikTok</span>
                <FontAwesomeIcon icon={faTiktok} className="h-5 w-5" />
              </a>
            </li>
            <li>
              <a
                href="https://x.com/joinsamurai?s=21"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">X</span>
                <FontAwesomeIcon icon={faXTwitter} className="h-5 w-5" />
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com/@samuraiinsurance"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="YouTube"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">YouTube</span>
                <FontAwesomeIcon icon={faYoutube} className="h-[22px] w-[22px]" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

