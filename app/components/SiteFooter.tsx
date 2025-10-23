import { workSans } from "@/lib/fonts";

export function SiteFooter() {
  return (
    <footer className="pt-8 pb-28 sm:pb-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className={`${workSans.className} text-sm text-[#f7f6f3]/80`}>
          © 2025 Samurai Insurance. All Rights Reserved.
        </p>
        <nav aria-label="Social media">
          <ul className="flex flex-wrap items-center justify-center gap-3">
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=61579597801044"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">Facebook</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M22 12.07C22 6.476 17.523 2 11.93 2S1.86 6.476 1.86 12.07c0 4.97 3.657 9.09 8.438 9.87v-6.99H7.898v-2.88h2.4V9.845c0-2.37 1.422-3.677 3.6-3.677 1.043 0 2.134.186 2.134.186v2.35h-1.202c-1.185 0-1.556.738-1.556 1.49v1.79h2.65l-.423 2.88h-2.227v6.99c4.78-.78 8.437-4.9 8.437-9.87Z" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/samuraicodeai?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">Instagram</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Z" />
                  <path d="M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
                  <circle cx="17.5" cy="6.5" r="1.25" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://x.com/SamuraiCodeAi"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="X"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">X</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M3.5 3h4.2l4.1 6.1L16.6 3H21l-6.7 8 7 10h-4.2l-4.4-6.5L7.4 21H3l7.1-8.4L3.5 3Z" />
                </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com/@SamuraiCodeAi"
                target="_blank"
                rel="noreferrer noopener"
                aria-label="YouTube"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#de5e48] transition hover:text-[#ffb8a9] hover:bg-[#de5e48]/15"
              >
                <span className="sr-only">YouTube</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[22px] w-[22px]"
                  fill="none"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M21.8 7.8c-.1-.8-.3-1.5-.8-2-.6-.7-1.4-.9-1.8-.9-2.9-.2-7.2-.2-7.2-.2s-4.3 0-7.2.2c-.4 0-1.2.2-1.8.9-.5.5-.7 1.2-.8 2-.2 1.5-.2 3.2-.2 3.2s0 1.7.2 3.2c.1.8.3 1.5.8 2 .6.7 1.4.9 1.8.9 2.9.2 7.2.2 7.2.2s4.3 0 7.2-.2c.4 0 1.2-.2 1.8-.9.5-.5.7-1.2.8-2 .2-1.5.2-3.2.2-3.2s0-1.7-.2-3.2ZM10 9.75v4.5l3.75-2.25L10 9.75Z"
                  />
                </svg>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

