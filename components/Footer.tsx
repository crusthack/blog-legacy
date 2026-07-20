// /components/Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-16 w-full border-t border-gray-200 bg-gray-50 py-8 transition-colors dark:border-gray-800 dark:bg-[#292929]">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 text-sm text-gray-600 dark:text-gray-300">

        {/* Copyright */}
        <p className="text-center">
          © 2024 <span className="font-semibold">CrustHack</span>.  
          <span className="ml-1 opacity-80">All rights not reserved.</span>
        </p>

        {/* Contact */}
        <a
          href="mailto:crusthack@gmail.com"
          className="
            inline-flex items-center gap-2
            px-3 py-1.5
            rounded-full
            border border-gray-300
            text-gray-600
            hover:bg-gray-100 hover:text-gray-900
            transition-colors
            dark:border-gray-600 dark:text-gray-300
            dark:hover:bg-gray-800 dark:hover:text-white
          "
        >
          이메일: crusthack@gmail.com
        </a>

      </div>
    </footer>
  );
}
