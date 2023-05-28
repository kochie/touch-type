/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./renderer/src/**/*.{js,ts,jsx,tsx}",
    "./renderer/mdx-components.tsx"
  ],
  theme: {
    extend: {
      backgroundSize: {
        'size-200': '200% 200%',
        'size-300': '300% 300%'
      },
      backgroundPosition: {
        'pos-0': '0% 0%',
        'pos-50': '50% 50%',
        'pos-100': '100% 100%',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
};
