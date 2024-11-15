'use client';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';

type Props = {
  children: React.ReactNode;
  messages: Record<string, string>;
  locale: string;
};

export function LanguageProvider({ children, messages, locale }: Props) {
  i18n.loadAndActivate({ locale, messages });
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
