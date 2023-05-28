import Image from 'next/image'
import Link from 'next/link'

const h1 = ({ children }) => (
  <h1 className="text-2xl font-semibold leading-6 text-gray-900 my-2">
    {children}
  </h1>
)

const h2 = ({ children }) => (
  <h2 className="text-lg font-semibold leading-6 text-gray-900 my-1">
    {children}
  </h2>
)

const p = ({ children }) => (
  <p className="text-sm text-gray-500 my-1">
    {children}
  </p>
)

const ul = ({children}) => (
  <ul className="list-disc list-outside ml-5 text-sm text-gray-500 my-0.5">{children}</ul>
)

const li = ({children}) => (
  <li>{children}</li>
)

const a = ({ children, href }) => (
  <Link
    href={href}
    className="underline dark:text-orange-300 dark:hover:text-orange-600 text-indigo-600 hover:text-indigo-900 cursor-pointer"
  >
    {children}
  </Link>
)

const img = ({ src, alt }) => (
  <Image
    src={src}
    alt={alt}
    className="my-10 rounded-xl"
    style={{
      maxWidth: '100%',
      height: 'auto',
    }}
  />
)
export function useMDXComponents(components) {
  return { h1, h2, p, a, img, ul, li, ...components }
}
