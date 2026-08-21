import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Pages
import { HomePage } from './pages/HomePage';
import { EnsaiosPage } from './pages/EnsaiosPage';
import { EnsaioDetailPage } from './pages/EnsaioDetailPage';
import { CriticasPage } from './pages/CriticasPage';
import { CriticaDetailPage } from './pages/CriticaDetailPage';
import { EspeciaisPage } from './pages/EspeciaisPage';
import { EspecialDetailPage } from './pages/EspecialDetailPage';
import { CineastasPage } from './pages/CineastasPage';
import { CineastaDetailPage } from './pages/CineastaDetailPage';
import { FilmDetailPage } from './pages/FilmDetailPage';
import { PessoaDetailPage } from './pages/PessoaDetailPage';
import { PessoasPage } from './pages/PessoasPage';
import { EstreiasPage } from './pages/EstreiasPage';
import { ArquivoPage } from './pages/ArquivoPage';
import { SobrePage } from './pages/SobrePage';
import { TeamMemberDetailPage } from './pages/TeamMemberDetailPage';
import { ManifestoPage } from './pages/ManifestoPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [historyStack, setHistoryStack] = useState<string[]>(() => {
    const initial = window.location.pathname || '/';
    return initial === '/' ? ['/'] : ['/', initial];
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      setHistoryStack((prev) => {
        const idx = prev.lastIndexOf(path);
        if (idx !== -1) {
          return prev.slice(0, idx + 1);
        }
        return [...prev, path];
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path === currentPath) return;

    setCurrentPath(path);
    window.history.pushState({}, '', path);
    setHistoryStack((prev) => {
      if (prev[prev.length - 1] === path) return prev;
      return [...prev, path];
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setHistoryStack((prev) => {
      if (prev.length > 1) {
        const newStack = [...prev];
        newStack.pop(); // Remove current path
        const prevPath = newStack[newStack.length - 1] || '/';
        setCurrentPath(prevPath);
        window.history.pushState({}, '', prevPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return newStack;
      } else {
        // Fallback to home if stack has only 1 element
        setCurrentPath('/');
        window.history.pushState({}, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return ['/'];
      }
    });
  };

  // Route Parser
  const renderCurrentPage = () => {
    // Admin
    if (currentPath === '/admin') {
      return <AdminPage onNavigate={navigate} onGoBack={goBack} />;
    }

    // Filmes detail (Film Central Hub)
    if (currentPath.startsWith('/filmes/')) {
      const slug = currentPath.replace('/filmes/', '');
      return <FilmDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }

    // Pessoas detail & list
    if (currentPath.startsWith('/pessoas/')) {
      const slug = currentPath.replace('/pessoas/', '');
      return <PessoaDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/pessoas') {
      return <PessoasPage onNavigate={navigate} />;
    }

    // Estreias (Current & Historical weeks)
    if (currentPath.startsWith('/estreias')) {
      const parts = currentPath.replace('/estreias', '').replace(/^\//, '').split('/');
      // e.g. /estreias/2026/08/13 -> 2026-08-13
      let weekDate: string | undefined = undefined;
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        weekDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return <EstreiasPage onNavigate={navigate} selectedWeekDate={weekDate} />;
    }

    // Ensaios detail
    if (currentPath.startsWith('/ensaios/')) {
      const slug = currentPath.replace('/ensaios/', '');
      return <EnsaioDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/ensaios') {
      return <EnsaiosPage onNavigate={navigate} />;
    }

    // Criticas detail
    if (currentPath.startsWith('/criticas/')) {
      const slug = currentPath.replace('/criticas/', '');
      return <CriticaDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/criticas') {
      return <CriticasPage onNavigate={navigate} />;
    }

    // Especiais detail
    if (currentPath.startsWith('/especiais/')) {
      const slug = currentPath.replace('/especiais/', '');
      return <EspecialDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/especiais') {
      return <EspeciaisPage onNavigate={navigate} />;
    }

    // Cineastas detail (Redirects to /pessoas/:slug)
    if (currentPath.startsWith('/cineastas/')) {
      const slug = currentPath.replace('/cineastas/', '');
      return <PessoaDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/cineastas') {
      return <PessoasPage onNavigate={navigate} />;
    }

    // Arquivo
    if (currentPath === '/arquivo') {
      return <ArquivoPage onNavigate={navigate} />;
    }

    // Equipe detail
    if (currentPath.startsWith('/equipe/')) {
      const slug = currentPath.replace('/equipe/', '');
      return <TeamMemberDetailPage slug={slug} onNavigate={navigate} onGoBack={goBack} />;
    }
    if (currentPath === '/equipe') {
      return <SobrePage onNavigate={navigate} />;
    }

    // Sobre
    if (currentPath === '/sobre') {
      return <SobrePage onNavigate={navigate} />;
    }

    // Manifesto
    if (currentPath === '/manifesto') {
      return <ManifestoPage onNavigate={navigate} />;
    }

    // Default Home
    return <HomePage onNavigate={navigate} />;
  };

  // Don't render public header/footer on admin page for clean dashboard feel
  const isAdminPage = currentPath === '/admin';

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans-ui selection:bg-[#D4AF37] selection:text-[#1A1A1A]">
      {!isAdminPage && (
        <Header
          activePath={currentPath}
          onNavigate={navigate}
          onGoBack={goBack}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      {renderCurrentPage()}

      {!isAdminPage && <Footer onNavigate={navigate} />}

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={navigate}
      />
    </div>
  );
}
