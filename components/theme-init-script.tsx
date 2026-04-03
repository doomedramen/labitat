/**
 * Inline script to apply the saved theme before page renders.
 * This prevents the theme from only taking effect after user interaction on mobile.
 */
export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme) {
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (theme === 'system') {
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (prefersDark) {
                    document.documentElement.classList.add('dark');
                  }
                }
              }
            } catch (e) {}
          })();
        `,
      }}
    />
  )
}
