import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/Components/theme-provider';
import { I18nProvider } from '@/Components/i18n-provider';
import { Toaster } from '@/Components/ui/sonner';

const appName = import.meta.env.VITE_APP_NAME || 'Kaldi Academy';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const initialPage = props.initialPage as { props?: { auth?: { user?: { preferred_lang?: 'en' | 'am' } } } };
        const initialPreferredLang = initialPage.props?.auth?.user?.preferred_lang;

        root.render(
            <ThemeProvider>
                <I18nProvider initialPreferredLang={initialPreferredLang}>
                    <App {...props} />
                    <Toaster position="top-right" richColors />
                </I18nProvider>
            </ThemeProvider>,
        );
    },
    progress: {
        color: '#8a5a34',
    },
});
