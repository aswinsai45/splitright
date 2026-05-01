import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function Footer() {
  return (
    <div className="w-full pb-6 pt-2 mt-auto">
      <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500 text-xs">
        <span>Built by @aswinsai45</span>
        <a 
          href="https://github.com/aswinsai45" 
          target="_blank" 
          rel="noreferrer"
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
          aria-label="GitHub"
        >
          <FaGithub className="w-4 h-4" />
        </a>
        <a 
          href="https://www.linkedin.com/in/saiaswinraja/" 
          target="_blank" 
          rel="noreferrer"
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          aria-label="LinkedIn"
        >
          <FaLinkedin className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
