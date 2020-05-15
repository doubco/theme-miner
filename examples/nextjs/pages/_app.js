import React from "react";

import App from "next/app";
import Head from "next/head";

import { createGlobalStyle } from "styled-components";
import { WorldProvider } from "world-i18n/lib/react";

// import { UIProvider } from "theme-miner/lib/react/styled-components";
import { UIProvider } from "../theme-miner/react/styled-components";

import { UI } from "../ui";
import { world } from "../world";

const DocumentStyle = createGlobalStyle`
  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }

  *:focus {
    outline: none;
  }

  html,body {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
`;

class MyApp extends App {
  constructor(props) {
    super(props);
    this.state = {
      theme: "white",
    };
  }

  render() {
    const { Component, pageProps } = this.props;
    const { theme } = this.state;
    return (
      <>
        <Head>
          <title>ThemeMiner Demo</title>
        </Head>
        <DocumentStyle />
        <WorldProvider instance={world}>
          <UIProvider
            // pass the UI aka ThemeMiner Instance
            instance={UI}
            // this is the active theme, you can fetch it from cookie or local storage
            theme={theme}
          >
            <Component {...pageProps} />
          </UIProvider>
        </WorldProvider>
      </>
    );
  }
}

export default MyApp;
