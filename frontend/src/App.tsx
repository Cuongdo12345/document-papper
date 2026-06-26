
// src/App.tsx
// import { useEffect } from 'react';
// import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
// import { QueryClientProvider } from '@tanstack/react-query';
// import { ConfigProvider, App as AntdApp } from 'antd';
// import { queryClient } from './lib/queryClient';
// import { authRoutes } from './router/routes/auth.routes';
// import { appRoutes } from './router/routes/app.routes';   // ← THÊM
// import { useAuthStore } from './store/auth.store';
// import NotificationBridge from './components/feedback/NotificationBridge';

// const router = createBrowserRouter([
//   ...authRoutes,   // /login, /forgot-password, /reset-password
//   ...appRoutes,    // /403 + private routes (sẽ thêm dần)   ← THÊM
//   {
//     path: '/',
//     element: <Navigate to="/login" replace />,
//   },
//   // ← THÊM: Redirect tạm cho các route chưa build
//   // {
//   //   path: '/dashboard',
//   //   element: <Navigate to="/login" replace />,
//   // },
//   // {
//   //   path: '/documents/proposals',
//   //   element: <Navigate to="/login" replace />,
//   // },
// ]);

// export default function App() {
//   // Cross-tab logout sync — AUTH_MODULE_ANALYSIS.md §2.7 / §3.4 Scenario D
//   useEffect(() => {
//     const handleStorage = (e: StorageEvent) => {
//       if (e.key === 'auth-storage' && e.newValue === null) {
//         useAuthStore.getState().logout();
//         if (window.location.pathname !== '/login') {
//           window.location.href = '/login';
//         }
//       }
//     };

//     window.addEventListener('storage', handleStorage);
//     return () => window.removeEventListener('storage', handleStorage);
//   }, []);

//   return (
//     <ConfigProvider>
//       <AntdApp>
//         <QueryClientProvider client={queryClient}>
//           <RouterProvider router={router} />
//           <NotificationBridge />
//         </QueryClientProvider>
//       </AntdApp>
//     </ConfigProvider>
//   );
// }

// src/App.tsx
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp } from 'antd';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { useAuthStore } from './store/auth.store';
import NotificationBridge from './components/feedback/NotificationBridge';

export default function App() {
  // Cross-tab logout sync — AUTH_MODULE_ANALYSIS.md §2.7 / §3.4 Scenario D
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auth-storage' && e.newValue === null) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <NotificationBridge />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}