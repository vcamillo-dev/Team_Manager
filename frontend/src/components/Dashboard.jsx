import { useEffect, useState } from 'react'
import { listarHistoricoNotas, listarJogadores } from '../services/jogadoresApi'
import '../styles/Dashboard.css'

function formatarNota(valor) {
  return valor === null || valor === undefined ? '—' : Number(valor).toFixed(2)
}

function formatarData(valor) {
  if (!valor) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(valor))
}

function calcularEvolucoes(jogadores, historico) {
  // Comparo o primeiro registro com o mais recente de cada jogador. Goleiro fica fora.
  return jogadores
    .filter((jogador) => !jogador.isGoleiro)
    .map((jogador) => {
      const registros = historico
        .filter((registro) => registro.jogadorId === jogador.id && registro.mediaTotal !== null)
        .sort((a, b) => new Date(a.dataRegistro) - new Date(b.dataRegistro))

      if (registros.length < 2) return null

      const primeiro = registros[0]
      const ultimo = registros[registros.length - 1]

      return {
        jogador,
        variacao: ultimo.mediaTotal - primeiro.mediaTotal,
        ultimaAtualizacao: ultimo.dataRegistro,
      }
    })
    .filter(Boolean)
}

function CartaoVariacao({ titulo, lista, direcao }) {
  return (
    <section className="cartao-dashboard cartao-variacoes">
      <div className="titulo-cartao">
        <h2>{titulo}</h2>
        <span className={`indicador-tendencia ${direcao}`} aria-hidden="true">
          {direcao === 'subindo' ? '↗' : '↘'}
        </span>
      </div>
      {lista.length ? (
        <ol className="lista-ranking">
          {lista.slice(0, 5).map((item, indice) => (
            <li key={item.jogador.id}>
              <span className="posicao-ranking">{indice + 1}.</span>
              <span className="nome-ranking">
                {item.jogador.nome}
                <small>Atualizado em {formatarData(item.ultimaAtualizacao)}</small>
              </span>
              <strong className={direcao}>
                {direcao === 'subindo' ? '+' : '−'}{Math.abs(item.variacao).toFixed(2)}
              </strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="estado-vazio">Ainda não há histórico suficiente para comparar.</p>
      )}
    </section>
  )
}

function LinhaComparacao({ titulo, notaA, notaB }) {
  const valorA = notaA === null || notaA === undefined ? null : Number(notaA)
  const valorB = notaB === null || notaB === undefined ? null : Number(notaB)
  // Só marco quem ganhou quando os dois têm uma nota preenchida.
  const vencedorA = valorA !== null && valorB !== null && valorA > valorB
  const vencedorB = valorA !== null && valorB !== null && valorB > valorA
  const diferenca = valorA !== null && valorB !== null
    ? Math.abs(valorA - valorB).toFixed(2)
    : null

  return (
    <div className="linha-comparacao">
      <span className="rotulo-comparacao">{titulo}</span>
      <div className="valores-comparacao">
        <div className={vencedorA ? 'lado-comparacao vencedor-comparacao' : 'lado-comparacao'}>
          <div className="valor-nota-comparacao">
            <strong>{formatarNota(valorA)}</strong>
            {vencedorA && <small>+{diferenca}</small>}
          </div>
          <div className="trilho-comparacao"><span style={{ width: `${(valorA ?? 0) * 20}%` }} /></div>
        </div>
        <div className={vencedorB ? 'lado-comparacao lado-comparacao-direita vencedor-comparacao' : 'lado-comparacao lado-comparacao-direita'}>
          <div className="valor-nota-comparacao">
            <strong>{formatarNota(valorB)}</strong>
            {vencedorB && <small>+{diferenca}</small>}
          </div>
          <div className="trilho-comparacao"><span style={{ width: `${(valorB ?? 0) * 20}%` }} /></div>
        </div>
      </div>
    </div>
  )
}

function GraficoEvolucao({ registros }) {
  const largura = 760
  const altura = 270
  const margem = { topo: 18, direita: 22, baixo: 42, esquerda: 42 }
  const valores = registros.map((registro) => Number(registro.mediaTotal))
  const minimo = Math.min(...valores, 0)
  const maximo = Math.max(...valores, 5)
  const escala = maximo - minimo || 1
  // Coloco cada média na linha do tempo para desenhar o gráfico.
  const pontos = registros.map((registro, indice) => {
    const x = registros.length === 1
      ? largura / 2
      : margem.esquerda + (indice / (registros.length - 1)) * (largura - margem.esquerda - margem.direita)
    const y = altura - margem.baixo - ((Number(registro.mediaTotal) - minimo) / escala) * (altura - margem.topo - margem.baixo)
    return { x, y, registro }
  })
  const caminho = pontos.map((ponto, indice) => `${indice === 0 ? 'M' : 'L'} ${ponto.x} ${ponto.y}`).join(' ')
  const linhasGrade = [0, 1, 2, 3, 4, 5].map((nota) => ({
    nota,
    y: altura - margem.baixo - ((nota - minimo) / escala) * (altura - margem.topo - margem.baixo),
  }))

  return (
    <div className="grafico-evolucao">
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Gráfico da média ao longo do tempo">
        {linhasGrade.map(({ nota, y }) => (
          <g key={nota}>
            <line x1={margem.esquerda} x2={largura - margem.direita} y1={y} y2={y} className="linha-grade" />
            <text x={margem.esquerda - 12} y={y + 4} textAnchor="end" className="texto-grade">{nota}</text>
          </g>
        ))}
        <path d={caminho} className="linha-evolucao" />
        {pontos.map((ponto) => (
          <g key={ponto.registro.id}>
            <circle cx={ponto.x} cy={ponto.y} r="5" className="ponto-evolucao" />
            <text x={ponto.x} y={ponto.y - 12} textAnchor="middle" className="valor-ponto">
              {Number(ponto.registro.mediaTotal).toFixed(2)}
            </text>
            <text x={ponto.x} y={altura - 12} textAnchor="middle" className="data-ponto">
              {formatarData(ponto.registro.dataRegistro)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function Dashboard({ pagina }) {
  const [jogadores, setJogadores] = useState([])
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [comparacaoAId, setComparacaoAId] = useState('')
  const [comparacaoBId, setComparacaoBId] = useState('')

  useEffect(() => {
    // Busco as notas atuais e o histórico para preencher as duas abas do dashboard.
    Promise.all([listarJogadores(), listarHistoricoNotas()])
      .then(([respostaJogadores, respostaHistorico]) => {
        setJogadores(respostaJogadores.data)
        setHistorico(respostaHistorico.data)
      })
      .catch(() => setErro('Não foi possível carregar o dashboard. Confira se o backend está rodando.'))
      .finally(() => setCarregando(false))
  }, [])

  const jogadoresOrdenados = [...jogadores]
    .filter((jogador) => !jogador.isGoleiro)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  // As estatísticas e a comparação usam jogadores de linha que já têm média.
  const jogadoresPontuados = jogadoresOrdenados.filter(
    (jogador) => jogador.mediaTotal !== null && jogador.mediaTotal !== undefined
  )
  const jogadoresPorMedia = [...jogadoresPontuados].sort((a, b) => b.mediaTotal - a.mediaTotal)
  const mediaGeral = jogadoresPontuados.length
    ? jogadoresPontuados.reduce((soma, jogador) => soma + jogador.mediaTotal, 0) / jogadoresPontuados.length
    : null
  const melhorMedia = jogadoresPorMedia[0] ?? null
  const piorMedia = jogadoresPorMedia[jogadoresPorMedia.length - 1] ?? null
  // Calculo a média de cada avaliador usando só as notas que ele realmente deu.
  const mediaAvaliadores = [
    { nome: 'Marcelinho', campo: 'notaMarcelinho' },
    { nome: 'Camillo', campo: 'notaCamilinho' },
    { nome: 'Convidado', campo: 'notaConvidado' },
  ].map((avaliador) => {
    const notas = jogadoresOrdenados
      .map((jogador) => jogador[avaliador.campo])
      .filter((nota) => nota !== null && nota !== undefined)
    return {
      ...avaliador,
      media: notas.length ? notas.reduce((soma, nota) => soma + nota, 0) / notas.length : null,
      quantidade: notas.length,
    }
  })
  // Se a pessoa ainda não escolheu ninguém, começo comparando os dois maiores resultados.
  const comparacaoA = jogadoresOrdenados.find((jogador) => jogador.id === Number(comparacaoAId))
    ?? jogadoresPorMedia[0]
    ?? null
  const comparacaoB = jogadoresOrdenados.find((jogador) => jogador.id === Number(comparacaoBId))
    ?? jogadoresPorMedia.find((jogador) => jogador.id !== comparacaoA?.id)
    ?? null
  const evolucoes = calcularEvolucoes(jogadores, historico)
  const subindo = evolucoes
    .filter((item) => item.variacao > 0.001)
    .sort((a, b) => b.variacao - a.variacao)
  const caindo = evolucoes
    .filter((item) => item.variacao < -0.001)
    .sort((a, b) => a.variacao - b.variacao)
  const jogadorSelecionado = jogadoresOrdenados.find(
    (jogador) => jogador.nome.toLocaleLowerCase('pt-BR') === busca.trim().toLocaleLowerCase('pt-BR')
  )
  const historicoSelecionado = jogadorSelecionado
    ? historico
      .filter((registro) => registro.jogadorId === jogadorSelecionado.id && registro.mediaTotal !== null)
      .sort((a, b) => new Date(a.dataRegistro) - new Date(b.dataRegistro))
    : []
  const variacaoSelecionada = historicoSelecionado.length > 1
    ? historicoSelecionado[historicoSelecionado.length - 1].mediaTotal - historicoSelecionado[0].mediaTotal
    : null

  if (carregando) return <div className="estado-dashboard">Carregando dashboard…</div>
  if (erro) return <div className="estado-dashboard erro-dashboard">{erro}</div>

  if (pagina === 'principal') {
    return (
      <section className="pagina-dashboard">
        <header className="cabecalho-dashboard">
          <div>
            <h1>Dashboard</h1>
          </div>
        </header>

        <div className="grade-estatisticas grade-estatisticas-dashboard">
          <article className="estatistica-dashboard">
            <span>Jogadores avaliados</span>
            <strong>{jogadoresPontuados.length}</strong>
            <small>jogadores de linha</small>
          </article>
          <article className="estatistica-dashboard">
            <span>Média do grupo</span>
            <strong>{formatarNota(mediaGeral)}</strong>
            <small>média das notas individuais</small>
          </article>
          <article className="estatistica-dashboard">
            <span>Maior média</span>
            <strong>{formatarNota(melhorMedia?.mediaTotal)}</strong>
            <small>{melhorMedia?.nome ?? 'Sem dados'}</small>
          </article>
          <article className="estatistica-dashboard">
            <span>Menor média</span>
            <strong>{formatarNota(piorMedia?.mediaTotal)}</strong>
            <small>{piorMedia?.nome ?? 'Sem dados'}</small>
          </article>
        </div>

        <div className="grade-tendencias">
          <CartaoVariacao titulo="Quem melhorou" lista={subindo} direcao="subindo" />
          <CartaoVariacao titulo="Quem piorou" lista={caindo} direcao="caindo" />
        </div>

        <section className="cartao-dashboard painel-avaliadores">
          <div className="titulo-cartao">
            <h2>Média por avaliador</h2>
          </div>
          <div className="lista-medias-avaliadores">
            {mediaAvaliadores.map((avaliador) => (
              <div className="media-avaliador" key={avaliador.campo}>
                <span>{avaliador.nome}</span>
                <div className="trilho-avaliador">
                  <span style={{ width: `${(avaliador.media ?? 0) * 20}%` }} />
                </div>
                <strong>{formatarNota(avaliador.media)}</strong>
                <small>{avaliador.quantidade} notas</small>
              </div>
            ))}
          </div>
        </section>

        <section className="cartao-dashboard painel-comparacao">
          <div className="titulo-cartao">
            <h2>Comparação direta</h2>
          </div>
          {jogadoresPontuados.length > 1 ? (
            <>
              <div className="seletores-comparacao">
                <label>
                  Jogador 1
                  <select
                    value={comparacaoA?.id ?? ''}
                    onChange={(evento) => setComparacaoAId(evento.target.value)}
                  >
                    {jogadoresPorMedia.map((jogador) => (
                      <option key={jogador.id} value={jogador.id} disabled={jogador.id === comparacaoB?.id}>
                        {jogador.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="versus-comparacao">×</span>
                <label>
                  Jogador 2
                  <select
                    value={comparacaoB?.id ?? ''}
                    onChange={(evento) => setComparacaoBId(evento.target.value)}
                  >
                    {jogadoresPorMedia.map((jogador) => (
                      <option key={jogador.id} value={jogador.id} disabled={jogador.id === comparacaoA?.id}>
                        {jogador.nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {comparacaoA && comparacaoB && (
                <>
                  <div className="cabecalho-comparacao">
                    <strong>{comparacaoA.nome}</strong>
                    <strong>{comparacaoB.nome}</strong>
                  </div>
                  <div className="linhas-comparacao">
                    <LinhaComparacao titulo="Média geral" notaA={comparacaoA.mediaTotal} notaB={comparacaoB.mediaTotal} />
                    <LinhaComparacao titulo="Marcelinho" notaA={comparacaoA.notaMarcelinho} notaB={comparacaoB.notaMarcelinho} />
                    <LinhaComparacao titulo="Camillo" notaA={comparacaoA.notaCamilinho} notaB={comparacaoB.notaCamilinho} />
                    <LinhaComparacao titulo="Convidado" notaA={comparacaoA.notaConvidado} notaB={comparacaoB.notaConvidado} />
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="estado-vazio">Ainda não há dois jogadores com média para comparar.</p>
          )}
        </section>
      </section>
    )
  }

  return (
    <section className="pagina-dashboard">
      <header className="cabecalho-dashboard">
        <div>
          <h1>Notas por jogador</h1>
          <p>Escolha alguém para ver as notas e como a média mudou.</p>
        </div>
      </header>

      <section className="cartao-dashboard busca-jogador">
          <label htmlFor="busca-jogador">Quem você quer consultar?</label>
        <input
          id="busca-jogador"
          type="search"
          list="nomes-jogadores"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Comece a digitar um nome"
          autoComplete="off"
        />
        <datalist id="nomes-jogadores">
          {jogadoresOrdenados.map((jogador) => <option key={jogador.id} value={jogador.nome} />)}
        </datalist>
      </section>

      {!busca.trim() ? (
        null
      ) : !jogadorSelecionado ? (
        <div className="cartao-dashboard estado-vazio painel-vazio">Selecione um nome cadastrado na lista para abrir o desempenho individual.</div>
      ) : (
        <>
          <section className="cabecalho-jogador cartao-dashboard">
            <div>
              <h2>{jogadorSelecionado.nome}</h2>
            </div>
            <div className="media-atual">
                <span>Média agora</span>
              <strong>{formatarNota(jogadorSelecionado.mediaTotal)}</strong>
            </div>
          </section>

          <div className="grade-metricas-individual">
            <article className="cartao-dashboard metrica-individual"><span>Marcelinho</span><strong>{formatarNota(jogadorSelecionado.notaMarcelinho)}</strong></article>
            <article className="cartao-dashboard metrica-individual"><span>Camillo</span><strong>{formatarNota(jogadorSelecionado.notaCamilinho)}</strong></article>
            <article className="cartao-dashboard metrica-individual"><span>Convidado</span><strong>{formatarNota(jogadorSelecionado.notaConvidado)}</strong></article>
            <article className="cartao-dashboard metrica-individual"><span>Mudança desde o início</span><strong className={variacaoSelecionada > 0 ? 'subindo' : variacaoSelecionada < 0 ? 'caindo' : ''}>{variacaoSelecionada === null ? '—' : `${variacaoSelecionada > 0 ? '+' : ''}${variacaoSelecionada.toFixed(2)}`}</strong></article>
          </div>

          <section className="cartao-dashboard cartao-grafico">
            <div className="titulo-cartao">
              <h2>Média ao longo do tempo</h2>
              <span className="contador-registros">{historicoSelecionado.length} {historicoSelecionado.length === 1 ? 'atualização' : 'atualizações'}</span>
            </div>
            {historicoSelecionado.length > 1 ? (
              <GraficoEvolucao registros={historicoSelecionado} />
            ) : (
              <p className="estado-vazio">Ainda há só um registro para este jogador. Quando uma nova nota for salva, a mudança aparece aqui.</p>
            )}
            <p className="nota-historico">O histórico começa a partir do primeiro registro salvo pelo site.</p>
          </section>
        </>
      )}
    </section>
  )
}

export default Dashboard
