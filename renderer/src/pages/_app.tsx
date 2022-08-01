import "../styles/globals.css";

function MyApp({ Component, pageProps }) {
  console.log("Sweet");
  return <Component {...pageProps} />;
}

export default MyApp;
