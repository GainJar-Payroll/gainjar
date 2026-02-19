"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export const ThemeProvider = ({ children, ...props }: any) => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};
