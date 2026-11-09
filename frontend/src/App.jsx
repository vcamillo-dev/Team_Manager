import { useState } from 'react'
import Dashboard from './components/Dashboard'
import TabelaJogadores from './components/TabelaJogadores'
import './App.css'

function App() {
  // Uma escolha troca entre Dashboard e Administração; no Dashboard guardo a aba aberta.
  const [paginaAtual, setPaginaAtual] = useState('dashboard')
  const [abaDashboard, setAbaDashboard] = useState('principal')

  return (
    <div className="aplicacao">
      <nav className="navbar-principal" aria-label="Navegação principal">
        <a className="marca-site" href="#dashboard" onClick={() => setPaginaAtual('dashboard')}>
          Pelada <span>Fênix</span>
        </a>
        <div className="links-navbar">
          <button
            className={paginaAtual === 'dashboard' ? 'link-navbar ativo' : 'link-navbar'}
            onClick={() => setPaginaAtual('dashboard')}
            aria-current={paginaAtual === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button
            className={paginaAtual === 'administracao' ? 'link-navbar ativo' : 'link-navbar'}
            onClick={() => setPaginaAtual('administracao')}
            aria-current={paginaAtual === 'administracao' ? 'page' : undefined}
          >
            Administração
          </button>
        </div>
      </nav>

      <main className="conteudo-principal">
        {paginaAtual === 'administracao' ? (
          <section className="pagina-administracao">
            <h1>Administração</h1>
            <p>Gerencie as notas dos jogadores.</p>
            <TabelaJogadores />
          </section>
        ) : (
          <div className="layout-dashboard">
            <nav className="abas-dashboard" aria-label="Abas do dashboard">
              {[
                { id: 'principal', nome: 'Principal' },
                { id: 'individual', nome: 'Individual' },
              ].map((pagina) => (
                <button
                  key={pagina.id}
                  className={abaDashboard === pagina.id ? 'link-navbar ativo' : 'link-navbar'}
                  onClick={() => setAbaDashboard(pagina.id)}
                  aria-current={abaDashboard === pagina.id ? 'page' : undefined}
                >
                  {pagina.nome}
                </button>
              ))}
            </nav>
            <div className="conteudo-dashboard">
              <Dashboard pagina={abaDashboard} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
